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

  const cleanStatuses = statuses.map(s => ({
    name: s.name,
    color: s.color,
    isDefault: s.isDefault,
    isClosed: s.isClosed,
  }));

  await db.execute(sql`TRUNCATE TABLE ${schema.status} RESTART IDENTITY CASCADE`);

  const created = await db
    .insert(schema.status)
    .values(cleanStatuses)
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
