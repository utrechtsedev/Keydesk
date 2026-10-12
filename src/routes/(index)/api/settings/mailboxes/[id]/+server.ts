import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { mailboxView, updateMailbox } from '#lib/server/mail/mailboxes.js';
import { queueJob } from '#lib/server/queue.js';

export const PATCH: RequestHandler = async ({ request, params, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);
	const parsed = schema.imapMailboxSchema.safeParse(await request.json());
	if (!parsed.success) {
		return Response.json({ message: parsed.error.issues[0].message }, { status: 400 });
	}

	const saved = await updateMailbox(db, id, parsed.data);
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
