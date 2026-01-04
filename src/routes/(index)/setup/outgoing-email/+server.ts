import { decrypt, encrypt } from '$lib/server/db/encrypt';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { type SMTP } from '$lib/types';

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

	return json(
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
		return json({
			success: true,
			data: null
		});
	}

	const response: SMTP = config.value as SMTP;
	if (response.password) {
		response.password = decrypt(response.password);
	}

	return json({
		success: true,
		data: response
	});
};
