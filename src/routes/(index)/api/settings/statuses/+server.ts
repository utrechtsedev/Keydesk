import * as schema from '#lib/server/db/schema/index.js';
import { AppError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const status = await schema.validate(schema.insertStatusSchema)(request);

	const [created] = await db.insert(schema.status).values(status).returning();

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
	const statuses = await db.select().from(schema.status);

	return Response.json({
		success: true,
		data: statuses
	});
};
