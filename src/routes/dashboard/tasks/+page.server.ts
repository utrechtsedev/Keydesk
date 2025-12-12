import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { eq, and, gte, lte, asc, SQL } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, locals, url }) => {
  depends('app:tasks');

  const statusFilter = url.searchParams.get('status');
  const priorityFilter = url.searchParams.get('priority');
  const assigneeFilter = url.searchParams.get('assignee');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  const conditions: (SQL | undefined)[] = [];

  // Only filter by assignee if assigneeFilter is provided
  if (assigneeFilter) {
    conditions.push(eq(schema.task.assigneeId, parseInt(assigneeFilter)));
  }

  if (statusFilter) {
    conditions.push(eq(schema.task.statusId, Number(statusFilter)));
  }

  if (priorityFilter) {
    conditions.push(eq(schema.task.priorityId, Number(priorityFilter)));
  }

  if (dateFrom) {
    conditions.push(gte(schema.task.createdAt, new Date(dateFrom)));
  }

  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(schema.task.createdAt, endDate));
  }

  const tasks = await db.query.task.findMany({
    where: and(...conditions),
    with: {
      assignee: true,
      status: true,
      priority: true,
      creator: true,
      ticket: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
      subtasks: {
        with: {
          assignee: true,
          status: true,
          priority: true,
          creator: true,
          ticket: true,
          taskTags: {
            with: {
              tag: true,
            },
          },
        },
        orderBy: asc(schema.task.position),
      },
    },
    orderBy: asc(schema.task.dueDate),
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const filteredTasks = tasks.filter(task => {
    if (!task.status?.isClosed) return true;
    if (task.completedAt && task.completedAt >= sevenDaysAgo) return true;
    return false;
  });

  const tasksWithTags = filteredTasks.map(task => ({
    ...task,
    tags: task.taskTags.map(tt => tt.tag),
    subtasks: task.subtasks.map(subtask => ({
      ...subtask,
      tags: subtask.taskTags.map(tt => tt.tag),
    })),
  }));

  const finishedTasks = tasksWithTags.filter(task => task.status?.isClosed === true);
  const activeTasks = tasksWithTags.filter(task => task.status?.isClosed !== true);

  return {
    tasks: activeTasks,
    finishedTasks,
  };
};
