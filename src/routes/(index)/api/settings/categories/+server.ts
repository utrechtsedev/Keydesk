import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewCategory } from "$lib/server/db/schema";
import { AppError, ConflictError, NotFoundError, ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { categories } = await request.json() as { categories: NewCategory[] };

  if (!categories)
    throw new ValidationError('Categories are required')

  if (categories.length < 1)
    throw new ValidationError('You must at least have 1 category')

  const created = await db
    .insert(schema.category)
    .values(categories)
    .onConflictDoUpdate({
      target: schema.category.id,
      set: {
        name: sql`EXCLUDED.name`,
        description: sql`EXCLUDED.description`,
        prefix: sql`EXCLUDED.prefix`,
        updatedAt: new Date()
      }
    })
    .returning();

  if (!created || created.length === 0)
    throw new AppError('Failed to create record in database', 500);

  return json({
    success: true,
    data: created,
  }, { status: 201 });
};

export const GET: RequestHandler = async (): Promise<Response> => {
  const categories = await db
    .select()
    .from(schema.category);

  return json({
    success: true,
    data: categories,
  });
};

export const DELETE: RequestHandler = async ({ request }): Promise<Response> => {
  const { id } = await request.json() as { id: number };

  if (!id)
    throw new ValidationError('ID is required')

  // Check if category exists
  const [category] = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.id, id));

  if (!category) throw new NotFoundError('Category not found.')

  const [ticketCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.ticket)
    .where(eq(schema.ticket.categoryId, id));

  if (Number(ticketCount.count) > 0)
    throw new ConflictError('Cannot delete category with associated tickets. Please reassign or delete all tickets first.');

  await db
    .delete(schema.category)
    .where(eq(schema.category.id, id));

  return json({
    success: true,
    message: 'Category deleted successfully.'
  });
};
