import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { Task as TaskType } from "$lib/types";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
  try {
    const { task } = await request.json() as { task: TaskType };

    if (!task?.title?.trim()) {
      return json({ error: 'Task title is required' }, { status: 400 });
    }

    if (!task.assigneeId) {
      return json({ error: 'Assignee is required' }, { status: 400 });
    }

    if (!task.statusId) {
      return json({ error: 'Status is required' }, { status: 400 });
    }

    if (!task.priorityId) {
      return json({ error: 'Priority is required' }, { status: 400 });
    }

    // Verify assignee exists
    const [assignee] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, task.assigneeId));

    if (!assignee) {
      return json({ error: 'Assignee not found' }, { status: 404 });
    }

    // Verify status exists
    const [status] = await db
      .select()
      .from(schema.status)
      .where(eq(schema.status.id, task.statusId));

    if (!status) {
      return json({ error: 'Status not found' }, { status: 404 });
    }

    // Verify priority exists
    const [priority] = await db
      .select()
      .from(schema.priority)
      .where(eq(schema.priority.id, task.priorityId));

    if (!priority) {
      return json({ error: 'Priority not found' }, { status: 404 });
    }

    // Verify parent task if provided
    if (task.parentTaskId) {
      const [parentTask] = await db
        .select()
        .from(schema.task)
        .where(eq(schema.task.id, task.parentTaskId));

      if (!parentTask) {
        return json({ error: 'Parent task not found.' }, { status: 404 });
      }

      if (parentTask.parentTaskId) {
        return json({ error: 'Task cannot be subtask of subtask.' }, { status: 400 });
      }
    }

    // Create the task
    const [newTask] = await db
      .insert(schema.task)
      .values({
        title: task.title.trim(),
        description: task.description || null,
        assigneeId: task.assigneeId,
        createdById: locals.user.id,
        ticketId: task.ticketId || null,
        parentTaskId: task.parentTaskId || null,
        statusId: task.statusId,
        priorityId: task.priorityId,
        dueDate: task.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startDate: task.startDate || null,
        completedAt: null,
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
            tag: true,
          },
        },
      },
    });

    // Transform tags from join table format
    const taskWithTags = createdTask ? {
      ...createdTask,
      tags: createdTask.taskTags.map(tt => tt.tag),
    } : null;

    return json({
      success: true,
      task: taskWithTags
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating task:', error);
    return json({
      error: 'Failed to create task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { task } = await request.json() as { task: TaskType };

    if (!task?.id) {
      return json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (!task.assigneeId) {
      return json({ error: 'Assignee ID is required' }, { status: 400 });
    }

    // Find the task
    const [findTask] = await db
      .select()
      .from(schema.task)
      .where(eq(schema.task.id, task.id));

    if (!findTask) {
      return json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify parent task if provided
    if (task.parentTaskId) {
      const [parentTask] = await db
        .select()
        .from(schema.task)
        .where(eq(schema.task.id, task.parentTaskId));

      if (!parentTask) {
        return json({ error: 'Parent task not found.' }, { status: 404 });
      }

      if (parentTask.parentTaskId) {
        return json({ error: 'Task cannot be subtask of subtask.' }, { status: 400 });
      }

      if (parentTask.id === findTask.id) {
        return json({ error: 'Task cannot be its own parent.' }, { status: 400 });
      }
    }

    // Update the task
    const [updatedTask] = await db
      .update(schema.task)
      .set({
        title: task.title,
        description: task.description,
        assigneeId: task.assigneeId,
        ticketId: task.ticketId,
        parentTaskId: task.parentTaskId || null,
        statusId: task.statusId,
        priorityId: task.priorityId,
        dueDate: task.dueDate,
        startDate: task.startDate,
        completedAt: task.completedAt,
        position: task.position,
      })
      .where(eq(schema.task.id, task.id))
      .returning();

    // Check if status is closed, and if so, close all subtasks
    const [updatedStatus] = await db
      .select()
      .from(schema.status)
      .where(eq(schema.status.id, task.statusId));

    if (updatedStatus?.isClosed) {
      await db
        .update(schema.task)
        .set({ statusId: task.statusId })
        .where(eq(schema.task.parentTaskId, task.id));
    }

    return json({ success: true, task: updatedTask });

  } catch (error) {
    console.error('Error updating task:', error);
    return json({
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
