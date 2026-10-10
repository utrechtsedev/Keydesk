import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const businessHours = await schema.validate(schema.businessHoursSettingsSchema)(request);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'business-hours',
			value: businessHours
		})
		.onConflictDoUpdate({
			target: schema.config.key,
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

export const GET: RequestHandler = async (): Promise<Response> => {
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
