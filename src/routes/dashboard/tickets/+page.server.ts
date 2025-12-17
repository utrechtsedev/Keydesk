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
    case 'ticket-number':
      orderByClause = orderFn(schema.ticket.ticketNumber);
      break;
    case 'subject':
      orderByClause = orderFn(schema.ticket.subject);
      break;
    case 'requester-name':
      orderByClause = orderFn(schema.requester.name);
      break;
    case 'category-name':
      orderByClause = orderFn(schema.category.name);
      break;
    case 'user-name':
      orderByClause = orderFn(schema.user.name);
      break;
    case 'status-name':
      orderByClause = orderFn(schema.status.name);
      break;
    case 'priority-name':
      orderByClause = orderFn(schema.priority.name);
      break;
    case 'resolved-at':
      orderByClause = orderFn(schema.ticket.resolvedAt);
      break;
    case 'first-response-at':
      orderByClause = orderFn(schema.ticket.firstResponseAt);
      break;
    case 'updated-at':
      orderByClause = orderFn(schema.ticket.updatedAt);
      break;
    case 'created-at':
    default:
      orderByClause = orderFn(schema.ticket.createdAt);
  }

  const tickets = await db
    .select({
      id: schema.ticket.id,
      ticketNumber: schema.ticket.ticketNumber,
      subject: schema.ticket.subject,
      channel: schema.ticket.channel,
      statusId: schema.ticket.statusId,
      priorityId: schema.ticket.priorityId,
      categoryId: schema.ticket.categoryId,
      requesterId: schema.ticket.requesterId,
      assignedUserId: schema.ticket.assignedUserId,
      firstResponseAt: schema.ticket.firstResponseAt,
      resolvedAt: schema.ticket.resolvedAt,
      closedAt: schema.ticket.closedAt,
      targetDate: schema.ticket.targetDate,
      responseCount: schema.ticket.responseCount,
      createdAt: schema.ticket.createdAt,
      updatedAt: schema.ticket.updatedAt,
      requester: schema.requester,
      category: schema.category,
      assignedUser: schema.user,
      status: schema.status,
      priority: schema.priority,
    })
    .from(schema.ticket)
    .leftJoin(schema.requester, eq(schema.ticket.requesterId, schema.requester.id))
    .leftJoin(schema.category, eq(schema.ticket.categoryId, schema.category.id))
    .leftJoin(schema.user, eq(schema.ticket.assignedUserId, schema.user.id))
    .leftJoin(schema.status, eq(schema.ticket.statusId, schema.status.id))
    .leftJoin(schema.priority, eq(schema.ticket.priorityId, schema.priority.id))
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

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
