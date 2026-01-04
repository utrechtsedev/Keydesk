import { ImapFlow } from 'imapflow';
import { json, type RequestHandler } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import * as schema from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const imap = await schema.validate(schema.imapSettingsSchema)(request);

	const testClient = new ImapFlow({
		host: imap.host,
		port: imap.port,
		secure: imap.SSL,
		auth: {
			user: imap.username,
			pass: imap.password
		},
		logger: false
	});

	const timeoutPromise = new Promise((_, reject) =>
		setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
	);

	const connectionPromise = (async () => {
		await testClient.connect();
		logger.info({ host: imap.host }, 'IMAP Connected successfully');

		await testClient.mailboxOpen('INBOX');
		logger.info({ host: imap.host }, 'IMAP Mailbox opened');

		const mailboxInfo = await testClient.status('INBOX', { messages: true });
		logger.info({ mailboxInfo }, 'IMAP Mailbox info retrieved');

		await testClient.logout();
		logger.info({ host: imap.host }, 'IMAP Logged out');

		return mailboxInfo;
	})();

	const mailboxInfo = (await Promise.race([connectionPromise, timeoutPromise])) as any;

	return json(
		{
			success: true,
			message: `Connection successful! Found ${mailboxInfo.messages} messages in Inbox.`
		},
		{ status: 200 }
	);
};
