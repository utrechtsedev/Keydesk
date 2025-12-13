import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  ConflictError,
  NotFoundError,
  ValidationError } from '$lib/server/errors';

export const DELETE: RequestHandler = async ({ params }): Promise<Response> => {
  const id = Number(params.id);
  
  if (!id || isNaN(id)) {
    throw new ValidationError('Valid ID is required');
  }

  const [category] = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.id, id));
    
  if (!category) {
    throw new NotFoundError('Category not found.');
  }

  const [ticketCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.ticket)
    .where(eq(schema.ticket.categoryId, id));
    
  if (Number(ticketCount.count) > 0) {
    throw new ConflictError(
      'Cannot delete category with associated tickets. Please reassign or delete all tickets first.'
    );
  }

  await db
    .delete(schema.category)
    .where(eq(schema.category.id, id));

  return json({
    success: true,
    message: 'Category deleted successfully.'
  });
};
