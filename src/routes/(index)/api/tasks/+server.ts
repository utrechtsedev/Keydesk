import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Task as TaskType } from '$lib/types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth-helper';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { sendNotification } from '$lib/server/queue';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { user } = requireAuth(locals);
	const { task } = (await request.json()) as { task: TaskType };

	if (!task?.title?.trim()) throw new ValidationError('Task title is required');

	if (!task.assigneeId) throw new ValidationError('Assignee is required');

	if (!task.statusId) throw new ValidationError('Status is required');

	if (!task.priorityId) throw new ValidationError('Priority is required');

	// Verify assignee exists
	const [assignee] = await db.select().from(schema.user).where(eq(schema.user.id, task.assigneeId));

	if (!assignee) throw new NotFoundError('Assignee not found');

	// Verify status exists
	const [status] = await db.select().from(schema.status).where(eq(schema.status.id, task.statusId));

	if (!status) throw new NotFoundError('Status not found');

	// Verify priority exists
	const [priority] = await db
		.select()
		.from(schema.priority)
		.where(eq(schema.priority.id, task.priorityId));

	if (!priority) throw new NotFoundError('Priority not found');

	// Verify parent task if provided
	if (task.parentTaskId) {
		const [parentTask] = await db
			.select()
			.from(schema.task)
			.where(eq(schema.task.id, task.parentTaskId));

		if (!parentTask) throw new NotFoundError('Parent task not found');

		if (parentTask.parentTaskId) throw new ValidationError('Task cannot be subtask of subtask');
	}

	// Create the task - convert date strings to Date objects
	const [newTask] = await db
		.insert(schema.task)
		.values({
			title: task.title.trim(),
			description: task.description || null,
			assigneeId: task.assigneeId,
			createdById: user.id,
			ticketId: task.ticketId || null,
			parentTaskId: task.parentTaskId || null,
			statusId: task.statusId,
			priorityId: task.priorityId,
			dueDate: task.dueDate
				? new Date(task.dueDate)
				: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			startDate: task.startDate ? new Date(task.startDate) : null,
			completedAt: null
		})
		.returning();

	// Fetch the created task with all relations
	const createdTask = await db.query.task.findFirst({
		where: eq(schema.task.id, newTask.id),
		with: {
			assignee: true,
			creator: true,
			status: true,
			priority: true,
			ticket: true,
			parentTask: true,
			subtasks: true,
			taskTags: {
				with: {
					tag: true
				}
			}
		}
	});

	const taskWithTags = createdTask
		? {
				...createdTask,
				tags: createdTask.taskTags.map((tt) => tt.tag)
			}
		: null;

	if (createdTask && createdTask.assigneeId && createdTask.assigneeId !== user.id)
		sendNotification({
			channels: ['dashboard', 'email'],
			title: 'New task',
			message: `Assigned to you by ${user.name}: ${task.title}`,
			recipient: { userId: createdTask.assigneeId },
			notification: {
				type: 'entity',
				event: 'created',
				entity: {
					type: 'task',
					id: createdTask.id
				}
			}
		});

	return json(
		{
			success: true,
			task: taskWithTags
		},
		{ status: 201 }
	);
};

export const PATCH: RequestHandler = async ({ request }): Promise<Response> => {
	const { ids, task } = (await request.json()) as {
		ids: number[];
		task: Partial<TaskType>;
	};

	// Validate input
	if (!ids || !Array.isArray(ids) || ids.length < 1)
		throw new ValidationError('Task IDs are required');

	if (!task || Object.keys(task).length === 0) throw new ValidationError('Update data is required');

	// Find tasks
	const findTasks = await db.select().from(schema.task).where(inArray(schema.task.id, ids));

	if (findTasks.length === 0) throw new NotFoundError('No tasks found with provided IDs');

	// Validate referenced entities if they're being updated
	if (task.statusId) {
		const [status] = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.id, task.statusId));

		if (!status) throw new NotFoundError('Status not found');
	}

	if (task.priorityId) {
		const [priority] = await db
			.select()
			.from(schema.priority)
			.where(eq(schema.priority.id, task.priorityId));

		if (!priority) throw new NotFoundError('Priority not found');
	}

	if (task.assigneeId) {
		const [assignee] = await db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, task.assigneeId));

		if (!assignee) throw new NotFoundError('Assignee not found');
	}

	if (task.ticketId) {
		const [ticket] = await db
			.select()
			.from(schema.ticket)
			.where(eq(schema.ticket.id, task.ticketId));

		if (!ticket) throw new NotFoundError('Ticket not found');
	}

	if (task.parentTaskId) {
		const [parentTask] = await db
			.select()
			.from(schema.task)
			.where(eq(schema.task.id, task.parentTaskId));

		if (!parentTask) throw new NotFoundError('Parent task not found');

		if (parentTask.parentTaskId) throw new ValidationError('Task cannot be subtask of subtask');

		// Prevent circular reference
		if (ids.includes(parentTask.id)) throw new ValidationError('Task cannot be its own parent');
	}

	// Build update data
	const updateData: Partial<TaskType> = {};

	// Only include fields that were provided
	if (task.title !== undefined) updateData.title = task.title.trim();
	if (task.description !== undefined) updateData.description = task.description || null;
	if (task.assigneeId !== undefined) updateData.assigneeId = task.assigneeId;
	if (task.ticketId !== undefined) updateData.ticketId = task.ticketId || null;
	if (task.parentTaskId !== undefined) updateData.parentTaskId = task.parentTaskId || null;
	if (task.statusId !== undefined) updateData.statusId = task.statusId;
	if (task.priorityId !== undefined) updateData.priorityId = task.priorityId;
	if (task.position !== undefined) updateData.position = task.position;

	if (task.dueDate !== undefined) {
		updateData.dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
	}

	if (task.startDate !== undefined) {
		updateData.startDate = task.startDate ? new Date(task.startDate) : null;
	}

	// Handle status-based automatic timestamps
	if (task.statusId) {
		const [status] = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.id, task.statusId));

		if (status) {
			// Set completedAt if status is closed
			if (status.isClosed) {
				updateData.completedAt = new Date();
			} else {
				updateData.completedAt = null;
			}
		}
	}

	// Perform bulk update
	await db.update(schema.task).set(updateData).where(inArray(schema.task.id, ids));

	// If tasks are being closed, close all subtasks
	if (task.statusId) {
		const [status] = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.id, task.statusId));

		if (status?.isClosed) {
			// Close all subtasks of the tasks being closed
			await db
				.update(schema.task)
				.set({
					statusId: task.statusId,
					completedAt: new Date()
				})
				.where(inArray(schema.task.parentTaskId, ids));
		}
	}

	return json(
		{
			success: true,
			updated: findTasks.length,
			taskIds: ids
		},
		{ status: 200 }
	);
};
