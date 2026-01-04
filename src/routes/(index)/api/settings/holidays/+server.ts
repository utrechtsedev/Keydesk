import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { ValidationError } from '$lib/server/errors';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const holidays = await schema.validate(schema.holidaySettingsSchema)(request);

	if (!holidays) throw new ValidationError('Holiday settings are required');

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'holidays',
			value: holidays
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: holidays,
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
	const [config] = await db.select().from(schema.config).where(eq(schema.config.key, 'holidays'));

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
