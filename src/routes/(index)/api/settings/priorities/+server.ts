import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewPriority, Priority } from "$lib/server/db/schema";
import { AppError, ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { priorities } = await request.json() as { priorities: NewPriority[] | Priority[] };

  if (!priorities)
    throw new ValidationError('Priorities are required.')

  if (priorities.length < 1)
    throw new ValidationError('You must at least have 1 priority.')


  const defaultPriorities = priorities.filter((p) => p.isDefault);
  if (defaultPriorities.length !== 1)
    throw new ValidationError('You must only have 1 default priority.')

  const cleanPriorities = priorities.map(p => ({
    name: p.name,
    color: p.color,
    isDefault: p.isDefault,
    order: p.order
  }));

  await db.execute(sql`TRUNCATE TABLE ${schema.priority} RESTART IDENTITY CASCADE`);

  const created = await db
    .insert(schema.priority)
    .values(cleanPriorities)
    .onConflictDoUpdate({
      target: schema.priority.id,
      set: {
        name: sql`EXCLUDED.name`,
        color: sql`EXCLUDED.color`,
        isDefault: sql`EXCLUDED.is_default`,
        order: sql`EXCLUDED.order`,
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
  const priorities = await db
    .select()
    .from(schema.priority);

  return json({
    success: true,
    data: priorities,
  });
};







