import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { eq, and, or, gte, lte, asc, SQL } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ depends, locals, url, params }) => {
  depends('app:tasks');

  const statusFilter = url.searchParams.get('status');
  const priorityFilter = url.searchParams.get('priority');
  const categoryFilter = url.searchParams.get('category');
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

  // Get all tasks with relations
  const tasks = await db.query.task.findMany({
    where: and(...conditions),
    with: {
      assignee: true,
      status: true,
      priority: true,
      subtasks: {
        with: {
          assignee: true,
          status: true,
          priority: true,
        },
        orderBy: asc(schema.task.position),
      },
    },
    orderBy: asc(schema.task.dueDate),
  });

  // Filter: show tasks that are either not closed OR closed within last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const filteredTasks = tasks.filter(task => {
    if (!task.status?.isClosed) return true;
    if (task.completedAt && task.completedAt >= sevenDaysAgo) return true;
    return false;
  });

  // Get the specific task by ID
  const task = await db.query.task.findFirst({
    where: eq(schema.task.id, parseInt(params.id)),
    with: {
      assignee: true,
      creator: true,
      status: true,
      priority: true,
      ticket: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
      subtasks: {
        with: {
          assignee: true,
          creator: true,
          status: true,
          priority: true,
          ticket: true,
          parentTask: true,
        },
        orderBy: asc(schema.task.position),
      },
    },
  });

  if (!task) {
    redirect(303, '/dashboard/tasks');
  }

  // Transform tags from join table format
  const taskWithTags = {
    ...task,
    tags: task.taskTags.map(tt => tt.tag),
  };

  const finishedTasks = filteredTasks.filter(task => task.status?.isClosed === true);
  const activeTasks = filteredTasks.filter(task => task.status?.isClosed !== true);

  console.log(activeTasks.length);

  return {
    tasks: activeTasks,
    task: taskWithTags,
    finishedTasks,
  };
};
