import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '$lib/server/errors';

export const PATCH: RequestHandler = async ({ request, params }): Promise<Response> => {
	const taskId = schema.idParamSchema.parse(params.id);

	const [findTask] = await db
		.select({
			task: schema.task,
			priority: schema.priority,
			status: schema.status
		})
		.from(schema.task)
		.leftJoin(schema.priority, eq(schema.task.priorityId, schema.priority.id))
		.leftJoin(schema.status, eq(schema.task.statusId, schema.status.id))
		.where(eq(schema.task.id, taskId));

	if (!findTask) {
		throw new NotFoundError('Task not found');
	}

	const task = await schema.validate(schema.insertTaskSchema)(request);

	if (task.parentTaskId) {
		const [parentTask] = await db
			.select()
			.from(schema.task)
			.where(eq(schema.task.id, task.parentTaskId));

		if (!parentTask) {
			throw new NotFoundError('Parent task not found');
		}

		if (parentTask.parentTaskId) {
			throw new ValidationError('Task cannot be subtask of subtask');
		}

		if (parentTask.id === taskId) {
			throw new ValidationError('Task cannot be its own parent');
		}
	}

	await db
		.update(schema.task)
		.set({
			title: task.title,
			description: task.description ?? null,
			assigneeId: task.assigneeId ?? null,
			ticketId: task.ticketId ?? null,
			parentTaskId: task.parentTaskId ?? null,
			statusId: task.statusId,
			priorityId: task.priorityId,
			dueDate: task.dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			startDate: task.startDate ?? null,
			completedAt: null // Don't let frontend set this
		})
		.where(eq(schema.task.id, taskId));

	const [updatedTask] = await db
		.select({
			task: schema.task,
			priority: schema.priority,
			status: schema.status
		})
		.from(schema.task)
		.leftJoin(schema.priority, eq(schema.task.priorityId, schema.priority.id))
		.leftJoin(schema.status, eq(schema.task.statusId, schema.status.id))
		.where(eq(schema.task.id, taskId));

	if (updatedTask.status?.isClosed) {
		await db
			.update(schema.task)
			.set({ statusId: task.statusId })
			.where(eq(schema.task.parentTaskId, taskId));
	}

	return json({
		success: true,
		task: updatedTask.task
	});
};
