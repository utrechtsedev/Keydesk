import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireAuth } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const businessHours = await schema.validate(schema.businessHoursSettingsSchema)(request);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'business-hours',
			value: businessHours
		})
		.onConflictDoUpdate({
			target: [schema.config.organizationId, schema.config.key],
			set: {
				value: businessHours,
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
		.where(eq(schema.config.key, 'business-hours'));

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
