import * as schema from '#lib/server/db/schema/index.js';
import { AppError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const category = await schema.validate(schema.insertCategorySchema)(request);

	const [created] = await db.insert(schema.category).values(category).returning();

	if (!created) throw new AppError('Failed to create record in database', 500);

	return Response.json(
		{
			success: true,
			data: created
		},
		{ status: 201 }
	);
};

export const GET: RequestHandler = async ({ locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const categories = await db.select().from(schema.category);

	return Response.json({
		success: true,
		data: categories
	});
};
