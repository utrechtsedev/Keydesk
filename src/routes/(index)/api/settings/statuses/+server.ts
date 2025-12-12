import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewStatus } from "$lib/server/db/schema";
import { AppError, ConflictError, NotFoundError, ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { statuses } = await request.json() as { statuses: NewStatus[] };

  if (!statuses)
    throw new ValidationError('Statuses are required.')

  if (statuses.length < 2)
    throw new ValidationError('You must at least have 2 statuses. 1 for open tickets, 1 for closed tickets')

  const defaultStatuses = statuses.filter((s) => s.isDefault);

  if (defaultStatuses.length !== 1)
    throw new ValidationError('You must only have 1 default status.')

  const openStatuses = statuses.filter((s) => !s.isClosed);
  if (openStatuses.length < 1)
    throw new ValidationError('You must have at least 1 open status.')

  const closedStatuses = statuses.filter((s) => s.isClosed);
  if (closedStatuses.length < 1)
    throw new ValidationError('You must have at least 1 closed status.')

  const created = await db
    .insert(schema.status)
    .values(statuses)
    .onConflictDoUpdate({
      target: schema.status.id,
      set: {
        name: sql`EXCLUDED.name`,
        color: sql`EXCLUDED.color`,
        isDefault: sql`EXCLUDED.is_default`,
        isClosed: sql`EXCLUDED.is_closed`,
        updatedAt: new Date()
      }
    })
    .returning();

  if (!created || created.length === 0)
    throw new AppError('Something went wrong while inserting fields into the database.', 500)

  return json({
    success: true,
    data: created,
  }, { status: 201 });
};

export const GET: RequestHandler = async (): Promise<Response> => {
  const statuses = await db
    .select()
    .from(schema.status);

  return json({
    success: true,
    data: statuses
  });
};

export const DELETE: RequestHandler = async ({ request }): Promise<Response> => {
  const { id } = await request.json() as { id: number };

  if (!id)
    throw new ValidationError('Status ID is required.')

  const [status] = await db
    .select()
    .from(schema.status)
    .where(eq(schema.status.id, id));

  if (!status)
    throw new NotFoundError('Status not found.')

  if (status.isDefault)
    throw new ConflictError('Cannot delete the default status. Set another status as default first.')

  const [ticketCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.ticket)
    .where(eq(schema.ticket.statusId, id));

  if (Number(ticketCount.count) > 0)
    throw new ConflictError('Cannot delete status with associated tickets. Please reassign or delete all tickets first.')


  const [openStatusCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.status)
    .where(eq(schema.status.isClosed, false));

  const [closedStatusCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.status)
    .where(eq(schema.status.isClosed, true));

  if (!status.isClosed && Number(openStatusCount.count) <= 1)
    throw new ConflictError('Cannot delete the last open status. At least 1 open status is required.')

  if (status.isClosed && Number(closedStatusCount.count) <= 1)
    throw new ConflictError('Cannot delete the last closed status. At least 1 closed status is required.')

  await db
    .delete(schema.status)
    .where(eq(schema.status.id, id));

  return json({
    success: true,
    message: 'Status deleted successfully.'
  });
};
