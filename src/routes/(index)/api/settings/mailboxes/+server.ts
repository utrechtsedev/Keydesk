import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { createImapMailbox, listMailboxes, mailboxView } from '#lib/server/mail/mailboxes.js';
import { queueJob } from '#lib/server/queue.js';

export const GET: RequestHandler = async ({ locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	return Response.json({ success: true, data: await listMailboxes(db) });
};

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const parsed = schema.imapMailboxSchema.safeParse(await request.json());
	if (!parsed.success) {
		return Response.json({ message: parsed.error.issues[0].message }, { status: 400 });
	}
	if (!parsed.data.imap.password || !parsed.data.smtp.password) {
		return Response.json({ message: 'Enter the IMAP and SMTP passwords.' }, { status: 400 });
	}

	const saved = await createImapMailbox(db, parsed.data);
	if (!saved.ok) {
		return Response.json({ message: saved.message }, { status: saved.status });
	}

	// The first sync notes where the inbox is now; mail from then on becomes tickets
	queueJob(locals, {
		type: 'mailbox-sync',
		organizationId: user.organizationId,
		mailboxId: saved.mailbox.id
	});
	return Response.json({ success: true, data: mailboxView(saved.mailbox) }, { status: 201 });
};
