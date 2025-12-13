import type { RequestHandler } from "./$types";
import * as schema from "$lib/server/db/schema"
import { db } from "$lib/server/db/database";
import { eq, sql } from "drizzle-orm";
import { json } from "@sveltejs/kit";
import {
  ConflictError,
  NotFoundError,
  ValidationError } from "$lib/server/errors";

export const DELETE: RequestHandler = async ({ params }): Promise<Response> => {
  const id = Number(params.id);

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
