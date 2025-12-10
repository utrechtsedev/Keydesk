import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";
import { or, ilike, sql, eq, asc, desc, SQL } from "drizzle-orm";

export const load: PageServerLoad = async ({ url, depends }) => {
  depends('app:tickets');

  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Number(url.searchParams.get('pageSize')) || 10;
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') || 'DESC').toUpperCase() as 'ASC' | 'DESC';
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * pageSize;

  // Build search conditions
  const searchConditions: SQL[] = [];
  if (search) {
    const searchPattern = `%${search}%`;
    searchConditions.push(
      or(
        ilike(schema.ticket.ticketNumber, searchPattern),
        ilike(schema.ticket.subject, searchPattern),
        ilike(schema.user.name, searchPattern),
        ilike(schema.requester.name, searchPattern)
      )!
    );
  }

  // Build order by clause
  const orderFn = sortOrder === 'DESC' ? desc : asc;
  let orderByClause: SQL;

  if (sortBy === 'requester.name' || sortBy === 'requester_name') {
    orderByClause = orderFn(schema.requester.name);
  } else if (sortBy === 'category.name' || sortBy === 'category_name') {
    orderByClause = orderFn(schema.category.name);
  } else if (sortBy === 'user.name' || sortBy === 'user_name') {
    orderByClause = orderFn(schema.user.name);
  } else if (sortBy === 'status.name' || sortBy === 'status_name') {
    orderByClause = orderFn(schema.status.name);
  } else if (sortBy === 'priority.name' || sortBy === 'priority_name') {
    orderByClause = orderFn(schema.priority.name);
  } else {
    // Default to ticket columns
    const ticketColumn = {
      'ticketNumber': schema.ticket.ticketNumber,
      'subject': schema.ticket.subject,
      'createdAt': schema.ticket.createdAt,
      'updatedAt': schema.ticket.updatedAt,
      'targetDate': schema.ticket.targetDate,
      'responseCount': schema.ticket.responseCount,
    }[sortBy] ?? schema.ticket.createdAt;

    orderByClause = orderFn(ticketColumn);
  }

  // Build the query with joins
  const baseQuery = db
    .select()
    .from(schema.ticket)
    .leftJoin(schema.requester, eq(schema.ticket.requesterId, schema.requester.id))
    .leftJoin(schema.category, eq(schema.ticket.categoryId, schema.category.id))
    .leftJoin(schema.user, eq(schema.ticket.assignedUserId, schema.user.id))
    .leftJoin(schema.status, eq(schema.ticket.statusId, schema.status.id))
    .leftJoin(schema.priority, eq(schema.ticket.priorityId, schema.priority.id))
    .$dynamic();

  // Apply search conditions
  const queryWithWhere = searchConditions.length > 0
    ? baseQuery.where(searchConditions[0])
    : baseQuery;

  // Fetch tickets with pagination
  const rows = await queryWithWhere
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  // Count total
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.ticket)
    .leftJoin(schema.requester, eq(schema.ticket.requesterId, schema.requester.id))
    .leftJoin(schema.user, eq(schema.ticket.assignedUserId, schema.user.id))
    .where(searchConditions.length > 0 ? searchConditions[0] : undefined);

  const totalCount = Number(countResult.count);

  // Transform the joined data into the expected format
  const tickets = rows.map(row => ({
    ...row.ticket,
    requester: row.requester,
    category: row.category,
    assignedUser: row.user,
    status: row.status,
    priority: row.priority,
  }));

  return {
    tickets,
    totalCount,
    pageCount: Math.ceil(totalCount / pageSize),
  };
};
