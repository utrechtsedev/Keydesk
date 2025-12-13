import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewStatus, Status } from "$lib/server/db/schema";
import { AppError, ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { statuses } = await request.json() as { statuses: NewStatus[] | Status[] };

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
    .values(statuses.map(s => ({
      ...s,
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
    })))
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
