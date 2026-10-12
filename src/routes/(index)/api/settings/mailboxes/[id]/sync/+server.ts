import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { findMailbox } from '#lib/server/mail/mailboxes.js';
import { queueJob } from '#lib/server/queue.js';

/** Syncs a mailbox now instead of at its next poll */
export const POST: RequestHandler = async ({ params, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);

	const mailbox = await findMailbox(db, id);
	if (!mailbox) {
		return Response.json({ message: 'Mailbox not found.' }, { status: 404 });
	}
	if (!mailbox.enabled) {
		return Response.json({ message: 'Switch the mailbox on first.' }, { status: 409 });
	}

	queueJob(locals, { type: 'mailbox-sync', organizationId: user.organizationId, mailboxId: id });
	return Response.json({ success: true, message: 'Sync started.' }, { status: 202 });
};
