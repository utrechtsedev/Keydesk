import { Priority, Status, Tag, Task, Ticket, User } from "$lib/server/db/models";
import { Op } from "sequelize";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, locals }) => {
  depends('app:tasks');

  // First query: Get task IDs where user is assigned
  const userTaskIds = await Task.findAll({
    attributes: ['id'],
    include: [{
      model: User,
      as: 'assignees',
      where: { id: locals.user.id },
      attributes: [],
      through: { attributes: [] }
    }],
    raw: true
  });
  console.log(userTaskIds.length)

  const taskIds = userTaskIds.map((t: any) => t.id);

  // Second query: Load full tasks with ALL assignees
  const tasks = await Task.findAll({
    where: {
      id: taskIds,
      [Op.or]: [
        // Open tasks
        {
          '$status.isClosed$': false
        },
        // Closed in last 7 days
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
        as: 'assignees',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'creator',
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
        model: Ticket,
        as: 'ticket',
        required: false
      },
      {
        model: Tag,
        as: 'tags',
        required: false
      },
      {
        model: Task,
        as: 'subtasks',
        required: false,
        include: [
          {
            model: User,
            as: 'assignees',
            through: { attributes: [] }
          },
          {
            model: User,
            as: 'creator',
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
            model: Ticket,
            as: 'ticket',
            required: false
          },
          {
            model: Task,
            as: 'parentTask',
            required: false
          }
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
