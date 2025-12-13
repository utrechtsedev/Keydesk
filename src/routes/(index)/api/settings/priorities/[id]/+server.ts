import type { RequestHandler } from "./$types";
import * as schema from "$lib/server/db/schema"
import { db } from "$lib/server/db/database";
import { json } from "@sveltejs/kit";
import { ConflictError, NotFoundError, ValidationError } from "$lib/server/errors";
import { eq, sql } from "drizzle-orm";

export const DELETE: RequestHandler = async ({ params }): Promise<Response> => {
  const id = Number(params.id);

  if (!id)
    throw new ValidationError('Priority ID is required.')

  const [priority] = await db
    .select()
    .from(schema.priority)
    .where(eq(schema.priority.id, id));

  if (!priority)
    throw new NotFoundError('Priority not found')

  if (priority.isDefault)
    throw new ValidationError('Cannot delete the default priority. Set another priority as default first.')

  const [ticketCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.ticket)
    .where(eq(schema.ticket.priorityId, id));

  if (Number(ticketCount.count) > 0)
    throw new ConflictError('Cannot delete priority with associated tickets. Please reassign or delete all tickets first.')


  const [priorityCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.priority);

  if (Number(priorityCount.count) <= 1)
    throw new ValidationError('Cannot delete the last priority. At least 1 priority is required.')

  await db
    .delete(schema.priority)
    .where(eq(schema.priority.id, id));

  return json({
    success: true,
    message: 'Priority deleted successfully.'
  });
};
