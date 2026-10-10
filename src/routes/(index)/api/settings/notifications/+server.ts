import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { ValidationError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const notifications = await schema.validate(schema.notificationSettingsSchema)(request);

	if (!notifications) throw new ValidationError('Notification settings are required');

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'notifications',
			value: notifications
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: notifications,
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

export const GET: RequestHandler = async (): Promise<Response> => {
	const [config] = await db
		.select()
		.from(schema.config)
		.where(eq(schema.config.key, 'notifications'));

	if (!config) {
		return Response.json({
			success: true,
			data: null
		});
	}

	return Response.json({
		success: true,
		data: config.value
	});
};
