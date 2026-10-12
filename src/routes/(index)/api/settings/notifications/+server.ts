import * as schema from '#lib/server/db/schema/index.js';
import { ValidationError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireAuth } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const notifications = await schema.validate(schema.notificationSettingsSchema)(request);

	if (!notifications) throw new ValidationError('Notification settings are required');

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'notifications',
			value: notifications
		})
		.onConflictDoUpdate({
			target: [schema.config.organizationId, schema.config.key],
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

export const GET: RequestHandler = async ({ locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
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
