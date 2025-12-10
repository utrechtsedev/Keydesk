import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";
import { eq, and, or, gte, lte, inArray, isNull, ilike, desc, asc, sql, SQL } from "drizzle-orm";

export const load: PageServerLoad = async ({ url, depends }) => {
  depends('app:tickets');

  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Number(url.searchParams.get('pageSize')) || 10;
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') || 'DESC').toUpperCase() as 'ASC' | 'DESC';
  const search = url.searchParams.get('search') || '';
  const statusFilter = url.searchParams.get('status');
  const priorityFilter = url.searchParams.get('priority');
  const categoryFilter = url.searchParams.get('category');
  const assigneeFilter = url.searchParams.get('assignee');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  const offset = (page - 1) * pageSize;

  const conditions: (SQL | undefined)[] = [];

  if (statusFilter) {
    conditions.push(eq(schema.ticket.statusId, Number(statusFilter)));
  } else {
    conditions.push(inArray(schema.ticket.statusId, [0, 1, 2, 3]));
  }

  if (priorityFilter) {
    conditions.push(eq(schema.ticket.priorityId, Number(priorityFilter)));
  }

  if (categoryFilter) {
    conditions.push(eq(schema.ticket.categoryId, Number(categoryFilter)));
  }

  if (assigneeFilter) {
    if (assigneeFilter === 'unassigned') {
      conditions.push(isNull(schema.ticket.assignedUserId));
    } else {
      conditions.push(eq(schema.ticket.assignedUserId, parseInt(assigneeFilter)));
    }
  }

  if (dateFrom) {
    conditions.push(gte(schema.ticket.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(schema.ticket.createdAt, endDate));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(schema.ticket.ticketNumber, searchPattern),
        ilike(schema.ticket.subject, searchPattern)
      )
    );
  }

  // Build order by based on sortBy
  const orderFn = sortOrder === 'DESC' ? desc : asc;
  let orderByClause;

  switch (sortBy) {
    case 'ticketNumber':
      orderByClause = orderFn(schema.ticket.ticketNumber);
      break;
    case 'subject':
      orderByClause = orderFn(schema.ticket.subject);
      break;
    case 'targetDate':
      orderByClause = orderFn(schema.ticket.targetDate);
      break;
    case 'updatedAt':
      orderByClause = orderFn(schema.ticket.updatedAt);
      break;
    case 'responseCount':
      orderByClause = orderFn(schema.ticket.responseCount);
      break;
    default:
      orderByClause = orderFn(schema.ticket.createdAt);
  }

  const tickets = await db.query.ticket.findMany({
    where: and(...conditions),
    with: {
      requester: true,
      category: true,
      assignedUser: true,
      status: true,
      priority: true,
    },
    limit: pageSize,
    offset,
    orderBy: orderByClause,
  });

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.ticket)
    .where(and(...conditions));

  const totalCount = Number(countResult.count);

  return {
    tickets,
    totalCount,
    pageCount: Math.ceil(totalCount / pageSize),
  };
};
