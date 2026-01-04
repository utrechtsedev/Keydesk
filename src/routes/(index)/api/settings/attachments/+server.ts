import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const attachments = await schema.validate(schema.attachmentSettingsSchema)(request);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'attachments',
			value: attachments
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: attachments,
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

export const GET: RequestHandler = async (): Promise<Response> => {
	const [config] = await db
		.select()
		.from(schema.config)
		.where(eq(schema.config.key, 'attachments'));

	if (!config) {
		return json({
			success: true,
			data: null
		});
	}

	return json({
		success: true,
		data: config.value
	});
};
