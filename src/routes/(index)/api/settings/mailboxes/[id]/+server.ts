import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import {
	findMailbox,
	mailboxView,
	updateImapMailbox,
	updateMailboxSettings,
	type SaveResult
} from '#lib/server/mail/mailboxes.js';
import type { ZodError } from 'zod';

const invalid = (error: ZodError) =>
	Response.json({ message: error.issues[0].message }, { status: 400 });
import { queueJob } from '#lib/server/queue.js';

export const PATCH: RequestHandler = async ({ request, params, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);
	const existing = await findMailbox(db, id);
	if (!existing) {
		return Response.json({ message: 'Mailbox not found.' }, { status: 404 });
	}

	// An IMAP mailbox's servers are edited here; other providers are connected at the provider
	const body = await request.json();
	let saved: SaveResult;
	if (existing.provider === 'imap') {
		const parsed = schema.imapMailboxSchema.safeParse(body);
		if (!parsed.success) return invalid(parsed.error);
		saved = await updateImapMailbox(db, id, parsed.data);
	} else {
		const parsed = schema.mailboxSettingsSchema.safeParse(body);
		if (!parsed.success) return invalid(parsed.error);
		saved = await updateMailboxSettings(db, id, parsed.data);
	}
	if (!saved.ok) {
		return Response.json({ message: saved.message }, { status: saved.status });
	}

	// The sync picks up the new settings, or stops when the mailbox is switched off
	queueJob(locals, { type: 'mailbox-sync', organizationId: user.organizationId, mailboxId: id });
	return Response.json({ success: true, data: mailboxView(saved.mailbox) });
};

export const DELETE: RequestHandler = async ({ params, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);

	// Its tickets and archived email stay; they just no longer point at a mailbox
	const [deleted] = await db
		.delete(schema.mailbox)
		.where(eq(schema.mailbox.id, id))
		.returning({ id: schema.mailbox.id });
	if (!deleted) {
		return Response.json({ message: 'Mailbox not found.' }, { status: 404 });
	}

	// The sync finds the mailbox gone and stops
	queueJob(locals, { type: 'mailbox-sync', organizationId: user.organizationId, mailboxId: id });
	return Response.json({ success: true, message: 'Mailbox deleted.' });
};
