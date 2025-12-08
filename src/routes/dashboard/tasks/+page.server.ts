import { Priority, Tag, Status, Task, User, Ticket } from "$lib/server/db/models";
import { Op, type WhereOptions } from "sequelize";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, locals, url }) => {
  depends('app:tasks');

  const statusFilter = url.searchParams.get('status');
  const priorityFilter = url.searchParams.get('priority');
  const categoryFilter = url.searchParams.get('category');
  const assigneeFilter = url.searchParams.get('assignee');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  const whereClause: WhereOptions = {};

  if (statusFilter) {
    whereClause.statusId = Number(statusFilter);
  }

  if (priorityFilter) {
    whereClause.priorityId = Number(priorityFilter);
  }

  if (categoryFilter) {
    whereClause.categoryId = Number(categoryFilter);
  }

  if (dateFrom || dateTo) {
    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateFilter[Op.lte] = endDate;
    }
    whereClause.createdAt = dateFilter;
  }

  const tasks = await Task.findAll({
    where: {
      assigneeId: assigneeFilter || locals.user.id,
      [Op.or]: [
        {
          '$status.isClosed$': false
        },
        {
          [Op.and]: [
            { '$status.isClosed$': true },
            { completedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
          ]
        }
      ]
    },
    order: [['dueDate', 'ASC']],
    include: [
      {
        model: User,
        as: 'assignee',
      },
      {
        model: Status,
        as: 'status',
      },
      {
        model: Priority,
        as: 'priority'
      },
      {
        model: Tag,
        as: 'tags'
      },
      {
        model: User,
        as: 'creator'
      },
      {
        model: Ticket,
        as: 'ticket'
      },
      {
        model: Task,
        as: 'subtasks',
        required: false,
        include: [
          {
            model: User,
            as: 'assignee',
          },
          {
            model: Status,
            as: 'status'
          },
          {
            model: Priority,
            as: 'priority'
          },
          {
            model: Tag,
            as: 'tags'
          },
          {
            model: User,
            as: 'creator'
          },
          {
            model: Ticket,
            as: 'ticket'
          },
        ]
      }
    ]
  });

  const tasksList = tasks.map(t => t.toJSON());

  const finishedTasks = tasksList.filter(task => task.status?.isClosed === true);
  const activeTasks = tasksList.filter(task => task.status?.isClosed !== true);

  console.log(activeTasks.length)
  return {
    tasks: activeTasks,
    finishedTasks,
    activeTasks
  };
};
