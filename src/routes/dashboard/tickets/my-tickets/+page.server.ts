import { Category, Priority, Requester, Status, Tag, Ticket, User } from "$lib/server/db/models";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { Order } from "sequelize";
import { Op } from "sequelize";

export const load: PageServerLoad = async ({ url, depends, locals }) => {
  if (!locals.user) {
    return error(401, { message: 'User not authenticated.' });
  }

  depends('app:tickets')
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Number(url.searchParams.get('pageSize')) || 10;
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') || 'DESC').toUpperCase() as 'ASC' | 'DESC';
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * pageSize;

  let orderClause: Order;
  if (sortBy === 'requester.name' || sortBy === 'requester_name') {
    orderClause = [[{ model: Requester, as: 'requester' }, 'name', sortOrder]];
  } else if (sortBy === 'category.name' || sortBy === 'category_name') {
    orderClause = [[{ model: Category, as: 'category' }, 'name', sortOrder]];
  } else if (sortBy === 'user.name' || sortBy === 'user_name') {
    orderClause = [[{ model: User, as: 'assignedUser' }, 'name', sortOrder]];
  } else if (sortBy === 'status.name' || sortBy === 'status_name') {
    orderClause = [[{ model: Status, as: 'status' }, 'name', sortOrder]];
  } else if (sortBy === 'priority.name' || sortBy === 'priority_name') {
    orderClause = [[{ model: Priority, as: 'priority' }, 'name', sortOrder]];
  } else {
    orderClause = [[sortBy, sortOrder]];
  }

  const whereClause = {
    assignedUserId: locals.user.id,
    ...(search && {
      [Op.or]: [
        { ticketNumber: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { '$assignedUser.name$': { [Op.like]: `%${search}%` } },
        { '$requester.name$': { [Op.like]: `%${search}%` } },
      ]
    })
  };

  const { count, rows } = await Ticket.findAndCountAll({
    where: whereClause,
    limit: pageSize,
    offset,
    order: orderClause,
    include: [
      {
        model: Requester,
        as: 'requester',
        required: false
      },
      {
        model: Category,
        as: 'category'
      },
      {
        model: User,
        as: 'assignedUser'
      },
      {
        model: Status,
        as: 'status'
      },
      {
        model: Priority,
        as: 'priority'
      }
    ]
  });

  return {
    tickets: rows.map(t => t.toJSON()),
    totalCount: count,
    pageCount: Math.ceil(count / pageSize),
  };
};
