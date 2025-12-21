import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import type { NewPriority } from '$lib/server/db/schema';
import { AppError, ValidationError } from '$lib/server/errors';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const { priority } = (await request.json()) as { priority: NewPriority };

	if (!priority) throw new ValidationError('Priority are required.');

	delete priority.id;
	delete priority.updatedAt;
	delete priority.createdAt;

	const [created] = await db.insert(schema.priority).values(priority).returning();

	if (!created) throw new AppError('Failed to create record in database', 500);

	return json(
		{
			success: true,
			data: created
		},
		{ status: 201 }
	);
};

export const GET: RequestHandler = async (): Promise<Response> => {
	const priorities = await db.select().from(schema.priority);

	return json({
		success: true,
		data: priorities
	});
};
