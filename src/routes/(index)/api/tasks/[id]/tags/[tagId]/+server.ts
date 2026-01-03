import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { NotFoundError } from '$lib/server/errors';
import { json } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ params }) => {
	const { id: taskId } = schema.idParamSchema.parse({ id: params.id });
	const { id: tagId } = schema.idParamSchema.parse({ id: params.tagId });

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

	return json({
		success: true,
		message: 'Tag removed from task'
	});
};
