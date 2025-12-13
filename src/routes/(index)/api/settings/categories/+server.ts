import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewCategory, Category } from "$lib/server/db/schema";
import { AppError, ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { categories } = await request.json() as { categories: NewCategory[] | Category[] };

  if (!categories)
    throw new ValidationError('Categories are required')

  if (categories.length < 1)
    throw new ValidationError('You must at least have 1 category')

  const cleanCategories = categories.map(cat => ({
    name: cat.name,
    description: cat.description,
    prefix: cat.prefix
  }));

  await db.execute(sql`TRUNCATE TABLE ${schema.category} RESTART IDENTITY CASCADE`);

  const created = await db
    .insert(schema.category)
    .values(cleanCategories)
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
