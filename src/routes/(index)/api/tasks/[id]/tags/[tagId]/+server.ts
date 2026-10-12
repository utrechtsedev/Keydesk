import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { NotFoundError } from '#lib/server/errors.js';
import { requireAuth } from '#lib/server/auth.js';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { db } = requireAuth(locals);
	const taskId = schema.idParamSchema.parse(params.id);
	const tagId = schema.idParamSchema.parse(params.tagId);

	const [task] = await db.select().from(schema.task).where(eq(schema.task.id, taskId));

	if (!task) {
		throw new NotFoundError('Task not found');
	}

	const deleted = await db
		.delete(schema.taskTag)
		.where(and(eq(schema.taskTag.taskId, taskId), eq(schema.taskTag.tagId, tagId)))
		.returning();

	if (deleted.length === 0) {
		throw new NotFoundError('Tag not found on this Task');
	}

	return Response.json({
		success: true,
		message: 'Tag removed from task'
	});
};
