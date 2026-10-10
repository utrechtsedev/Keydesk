import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { AppError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const priority = await schema.validate(schema.insertPrioritySchema)(request);

	const [created] = await db.insert(schema.priority).values(priority).returning();

	if (!created) throw new AppError('Failed to create record in database', 500);

	return Response.json(
		{
			success: true,
			data: created
		},
		{ status: 201 }
	);
};

export const GET: RequestHandler = async (): Promise<Response> => {
	const priorities = await db.select().from(schema.priority);

	return Response.json({
		success: true,
		data: priorities
	});
};
