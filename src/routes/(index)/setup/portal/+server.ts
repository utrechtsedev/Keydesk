import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const portal = await schema.validate(schema.portalSettingsSchema)(request);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'portal',
			value: portal
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: portal,
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
	const [config] = await db.select().from(schema.config).where(eq(schema.config.key, 'portal'));

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
