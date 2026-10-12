import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '#lib/server/auth.js';
import { createSmtpTransport } from '#lib/server/email/email.js';
import { openCredentials } from '#lib/server/mail/credentials.js';
import { credentialsFor, findMailbox } from '#lib/server/mail/mailboxes.js';
import { testImap } from '#lib/server/mail/imap.js';

const testSchema = schema.imapMailboxSchema.extend({
	/** For a mailbox being edited: its stored passwords fill in the ones left empty */
	id: z.number().int().positive().optional()
});

async function outcome(check: () => Promise<unknown>): Promise<{ ok: boolean; message: string }> {
	try {
		await check();
		return { ok: true, message: 'Connected' };
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}

/** Signs in to the IMAP and SMTP servers an admin entered, without saving anything */
export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const parsed = testSchema.safeParse(await request.json());
	if (!parsed.success) {
		return Response.json({ message: parsed.error.issues[0].message }, { status: 400 });
	}

	const existing = parsed.data.id ? await findMailbox(db, parsed.data.id) : null;
	if (parsed.data.id && !existing) {
		return Response.json({ message: 'Mailbox not found.' }, { status: 404 });
	}
	const credentials = credentialsFor(
		parsed.data,
		existing ? openCredentials(existing.credentials) : undefined
	);

	const [imap, smtp] = await Promise.all([
		outcome(() => testImap(credentials.imap)),
		outcome(async () => {
			const transporter = createSmtpTransport(credentials.smtp);
			try {
				await transporter.verify();
			} finally {
				transporter.close();
			}
		})
	]);
	return Response.json({ success: imap.ok && smtp.ok, imap, smtp });
};
