import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { Task as TaskType } from "$lib/types";
import { Task, User, Status } from "$lib/server/db/models";

export const PATCH: RequestHandler = async ({ request, locals }): Promise<Response> => {
  try {
    const { task } = await request.json() as { task: TaskType };

    if (!task?.id) {
      return json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (!task.assignees || task.assignees.length === 0) {
      return json({ error: 'At least one assignee is required' }, { status: 400 });
    }

    const findTask = await Task.findByPk(task.id);

    if (!findTask) {
      return json({ error: 'Task not found' }, { status: 404 });
    }

    await findTask.update({
      title: task.title,
      description: task.description,
      ticketId: task.ticketId,
      parentTaskId: task.parentTaskId,
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

    const assigneeIds = task.assignees.map(a => a.id);
    const assignees = await User.findAll({
      where: { id: assigneeIds }
    });

    if (assignees.length === 0) {
      return json({ error: 'No valid assignees found' }, { status: 400 });
    }

    await findTask.setAssignees(assignees);

    return json({ success: true, task: findTask.toJSON() });

  } catch (error) {
    console.error('Error updating task:', error);
    return json({
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
