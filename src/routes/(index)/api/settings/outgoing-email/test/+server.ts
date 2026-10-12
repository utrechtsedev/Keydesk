import { createSmtpTransport } from '#lib/server/email/email.js';
import type { RequestHandler } from '@sveltejs/kit';
import { logger } from '#lib/server/logger.js';
import * as schema from '#lib/server/db/schema/index.js';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const smtp = await schema.validate(schema.smtpSettingsSchema)(request);

	const transporter = createSmtpTransport(smtp);

	const timeoutPromise = new Promise((_, reject) =>
		setTimeout(() => reject(new Error('[SETUP] SMTP Connection timeout after 10 seconds')), 10000)
	);

	const connectionPromise = (async () => {
		await transporter.verify();
		logger.info({ host: smtp.host }, 'SMTP connection verified');

		return true;
	})();

	await Promise.race([connectionPromise, timeoutPromise]);

	return Response.json(
		{
			success: true,
			message: 'SMTP connection successful! Server is ready to send emails.'
		},
		{ status: 200 }
	);
};
