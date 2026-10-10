import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const organization = await schema.validate(schema.organizationSettingsSchema)(request);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'organization',
			value: organization
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: organization,
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
	const [config] = await db
		.select()
		.from(schema.config)
		.where(eq(schema.config.key, 'organization'));

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
