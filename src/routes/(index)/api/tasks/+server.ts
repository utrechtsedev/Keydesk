import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { Task as TaskType } from "$lib/types";
import { Task, Status, User, Priority } from "$lib/server/db/models";

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

    const assignee = await User.findByPk(task.assigneeId);
    if (!assignee) {
      return json({ error: 'Assignee not found' }, { status: 404 });
    }

    const status = await Status.findByPk(task.statusId);
    if (!status) {
      return json({ error: 'Status not found' }, { status: 404 });
    }

    const priority = await Priority.findByPk(task.priorityId);
    if (!priority) {
      return json({ error: 'Priority not found' }, { status: 404 });
    }

    if (task.parentTaskId) {
      const parentTask = await Task.findByPk(task.parentTaskId);

      if (!parentTask) {
        return json({ error: 'Parent task not found.' }, { status: 404 });
      }

      if (parentTask.parentTaskId) {
        return json({ error: 'Task cannot be subtask of subtask.' }, { status: 400 });
      }
    }


    const newTask = await Task.create({
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
    });

    const createdTask = await Task.findByPk(newTask.id, {
      include: [
        { association: 'assignee' },
        { association: 'creator' },
        { association: 'status' },
        { association: 'priority' },
        { association: 'ticket' },
        { association: 'parentTask' },
        { association: 'subtasks' },
        { association: 'tags' }
      ]
    });

    return json({
      success: true,
      task: createdTask?.toJSON()
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

    const findTask = await Task.findByPk(task.id);
    if (!findTask) {
      return json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.parentTaskId) {
      const parentTask = await Task.findByPk(task.parentTaskId);

      // Check if the parent exists
      if (!parentTask) {
        return json({ error: 'Parent task not found.' }, { status: 404 });
      }

      // Check if the parent is itself a subtask (has a parent)
      if (parentTask.parentTaskId) {
        return json({ error: 'Task cannot be subtask of subtask.' }, { status: 400 });
      }

      // Prevent circular reference (task cannot be its own parent)
      if (parentTask.id === findTask.id) {
        return json({ error: 'Task cannot be its own parent.' }, { status: 400 });
      }
    }

    await findTask.update({
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
      position: task.position
    });

    const updatedStatus = await Status.findByPk(task.statusId);
    if (updatedStatus?.isClosed) {
      await Task.update(
        { statusId: task.statusId },
        {
          where: { parentTaskId: task.id }
        }
      );
    }

    return json({ success: true, task: findTask.toJSON() });
  } catch (error) {
    console.error('Error updating task:', error);
    return json({
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
