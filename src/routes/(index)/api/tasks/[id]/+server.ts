import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { Task as TaskType } from "$lib/types";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "$lib/server/auth-helpers";
import { NotFoundError, ValidationError } from "$lib/server/errors";
import { sendNotification } from "$lib/server/job-queue";

export const PATCH: RequestHandler = async ({ request, locals, params }): Promise<Response> => {
  const taskId = Number(params.id);
  const { user } = requireAuth(locals);
  
  if (isNaN(taskId))
    throw new ValidationError('Invalid task ID');

  // Fetch task with related data (priority, status)
  const [findTask] = await db
    .select({
      task: schema.task,
      priority: schema.priority,
      status: schema.status,
    })
    .from(schema.task)
    .leftJoin(schema.priority, eq(schema.task.priorityId, schema.priority.id))
    .leftJoin(schema.status, eq(schema.task.statusId, schema.status.id))
    .where(eq(schema.task.id, taskId));

  if (!findTask)
    throw new NotFoundError('Task not found');

  const { task } = await request.json() as { task: TaskType };

  if (!task.assigneeId)
    throw new ValidationError('Assignee ID is required');

  // Verify parent task if provided
  if (task.parentTaskId) {
    const [parentTask] = await db
      .select()
      .from(schema.task)
      .where(eq(schema.task.id, task.parentTaskId));

    if (!parentTask)
      throw new NotFoundError('Parent task not found');

    if (parentTask.parentTaskId)
      throw new ValidationError('Task cannot be subtask of subtask');

    if (parentTask.id === findTask.task.id)
      throw new ValidationError('Task cannot be its own parent');
  }

  // Update the task
  await db
    .update(schema.task)
    .set({
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      ticketId: task.ticketId,
      parentTaskId: task.parentTaskId || null,
      statusId: task.statusId,
      priorityId: task.priorityId,
      dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
      startDate: task.startDate ? new Date(task.startDate) : null,
      completedAt: task.completedAt ? new Date(task.completedAt) : null,
      position: task.position,
    })
    .where(eq(schema.task.id, taskId));

  // Fetch updated task with related data
  const [updatedTask] = await db
    .select({
      task: schema.task,
      priority: schema.priority,
      status: schema.status,
    })
    .from(schema.task)
    .leftJoin(schema.priority, eq(schema.task.priorityId, schema.priority.id))
    .leftJoin(schema.status, eq(schema.task.statusId, schema.status.id))
    .where(eq(schema.task.id, taskId));

  // Check if status is closed, and if so, close all subtasks
  if (updatedTask.status?.isClosed) {
    await db
      .update(schema.task)
      .set({ statusId: task.statusId })
      .where(eq(schema.task.parentTaskId, taskId));
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  // 1. ASSIGNEE CHANGED - Notify new assignee
  if (
    updatedTask.task.assigneeId && 
    findTask.task.assigneeId !== updatedTask.task.assigneeId &&
    updatedTask.task.assigneeId !== user.id
  ) {
    await sendNotification({
      title: 'Assigned to you',
      message: `Task assigned by ${user.name}: ${updatedTask.task.title}`,
      recipient: { userId: updatedTask.task.assigneeId },
      channels: ['dashboard', 'email'],
      notification: {
        type: 'entity',
        event: 'assigned',
        entity: {
          type: 'task',
          id: taskId,
        }
      }
    });
  }

  // 2. ASSIGNEE REMOVED - Notify old assignee
  if (
    findTask.task.assigneeId && 
    !updatedTask.task.assigneeId &&
    findTask.task.assigneeId !== user.id
  ) {
    await sendNotification({
      title: 'Unassigned from task',
      message: `Task unassigned by ${user.name}: ${updatedTask.task.title}`,
      recipient: { userId: findTask.task.assigneeId },
      channels: ['dashboard', 'email'],
      notification: {
        type: 'entity',
        event: 'updated',
        entity: {
          type: 'task',
          id: taskId,
        }
      }
    });
  }

  // 3. PRIORITY CHANGED - Notify current assignee
  if (
    updatedTask.task.priorityId !== findTask.task.priorityId &&
    updatedTask.task.assigneeId &&
    updatedTask.task.assigneeId !== user.id
  ) {
    await sendNotification({
      title: 'Task updated',
      message: `Task priority changed from ${findTask.priority?.name || 'Unknown'} to ${updatedTask.priority?.name || 'Unknown'} by ${user.name}: ${updatedTask.task.title}`,
      recipient: { userId: updatedTask.task.assigneeId },
      channels: ['dashboard', 'email'],
      notification: {
        type: 'entity',
        event: 'updated',
        entity: {
          type: 'task',
          id: taskId,
        }
      }
    });
  }

  // 4. STATUS CHANGED - Notify assignee
  if (
    updatedTask.task.statusId !== findTask.task.statusId &&
    updatedTask.task.assigneeId &&
    updatedTask.task.assigneeId !== user.id
  ) {
    await sendNotification({
      title: 'Task updated',
      message: `Task status changed from ${findTask.status?.name || 'Unknown'} to ${updatedTask.status?.name || 'Unknown'} by ${user.name}: ${updatedTask.task.title}`,
      recipient: { userId: updatedTask.task.assigneeId },
      channels: ['dashboard', 'email'],
      notification: {
        type: 'entity',
        event: 'updated',
        entity: {
          type: 'task',
          id: taskId,
        }
      }
    });
  }

  // 5. TASK COMPLETED - Notify assignee
  if (
    updatedTask.task.completedAt && !findTask.task.completedAt &&
    updatedTask.task.assigneeId &&
    updatedTask.task.assigneeId !== user.id
  ) {
    await sendNotification({
      title: 'Task completed',
      message: `Task completed by ${user.name}: ${updatedTask.task.title}`,
      recipient: { userId: updatedTask.task.assigneeId },
      channels: ['dashboard'],
      notification: {
        type: 'entity',
        event: 'resolved',
        entity: {
          type: 'task',
          id: taskId,
        }
      }
    });
  }

  // 6. STATUS CHANGED TO CLOSED - Notify assignee
  if (
    updatedTask.task.statusId !== findTask.task.statusId &&
    updatedTask.status?.isClosed && !findTask.status?.isClosed &&
    updatedTask.task.assigneeId &&
    updatedTask.task.assigneeId !== user.id
  ) {
    await sendNotification({
      title: 'Task closed',
      message: `Task closed by ${user.name}: ${updatedTask.task.title}`,
      recipient: { userId: updatedTask.task.assigneeId },
      channels: ['dashboard'],
      notification: {
        type: 'entity',
        event: 'closed',
        entity: {
          type: 'task',
          id: taskId,
        }
      }
    });
  }

  return json({ 
    success: true, 
    task: updatedTask.task 
  });
};

