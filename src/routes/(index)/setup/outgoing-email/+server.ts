import { decrypt, encrypt } from '#lib/server/db/encrypt.js';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { type SMTP } from '#lib/types/index.js';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const smtp = await schema.validate(schema.smtpSettingsSchema)(request);
	if (smtp.password) smtp.password = encrypt(smtp.password);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'smtp',
			value: smtp
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: smtp,
				updatedAt: new Date()
			}
		})
		.returning();

	const created = config.createdAt.getTime() === config.updatedAt.getTime();

	return Response.json(
		{
			success: true,
			data: config.value,
			created
		},
		{ status: created ? 201 : 200 }
	);
};

export const GET: RequestHandler = async () => {
	const [config] = await db.select().from(schema.config).where(eq(schema.config.key, 'smtp'));

	if (!config) {
		return Response.json({
			success: true,
			data: null
		});
	}

	const response: SMTP = config.value as SMTP;
	if (response.password) {
		response.password = decrypt(response.password);
	}

	return Response.json({
		success: true,
		data: response
	});
};
