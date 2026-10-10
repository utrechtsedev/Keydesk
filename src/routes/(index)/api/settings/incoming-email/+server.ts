import { decrypt, encrypt } from '#lib/server/db/encrypt.js';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { type IMAP } from '#lib/types/index.js';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const imap = await schema.validate(schema.imapSettingsSchema)(request);
	imap.password = encrypt(imap.password);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'imap',
			value: imap
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: imap,
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
	const [config] = await db.select().from(schema.config).where(eq(schema.config.key, 'imap'));

	if (!config) {
		return Response.json({
			success: true,
			data: null
		});
	}

	const response: IMAP = config.value as IMAP;
	response.password = decrypt(response.password);

	return Response.json({
		success: true,
		data: response
	});
};
