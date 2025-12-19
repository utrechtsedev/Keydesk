import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import type { NewStatus, Status } from '$lib/server/db/schema';
import { AppError, ValidationError } from '$lib/server/errors';
import { json, type RequestHandler } from '@sveltejs/kit';
import { sql, eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { statuses } = await request.json() as { statuses: NewStatus[] | Status[] };
  
  if (!statuses)
    throw new ValidationError('Statuses are required.');

  // Validate system statuses exist
  const defaultStatuses = statuses.filter((s) => s.isDefault);
  if (defaultStatuses.length !== 1)
    throw new ValidationError('You must have exactly 1 default status.');

  const resolvedStatuses = statuses.filter((s) => s.isResolved);
  if (resolvedStatuses.length !== 1)
    throw new ValidationError('You must have exactly 1 resolved status.');

  const closedStatuses = statuses.filter((s) => s.isClosed);
  if (closedStatuses.length !== 1)
    throw new ValidationError('You must have exactly 1 closed status.');

  // Process each status
  for (const status of statuses) {
    if ('id' in status && status.id) {
      // UPDATING existing status
      const [existing] = await db
        .select()
        .from(schema.status)
        .where(eq(schema.status.id, status.id));

      if (existing) {
        // Prevent changing special flags
        if (existing.isDefault !== status.isDefault)
          throw new ValidationError('Cannot change isDefault flag.');
        if (existing.isResolved !== status.isResolved)
          throw new ValidationError('Cannot change isResolved flag.');
        if (existing.isClosed !== status.isClosed)
          throw new ValidationError('Cannot change isClosed flag.');
      }
    } else {
      // CREATING new status - force special flags to false
      if (status.isDefault)
        throw new ValidationError('Cannot create new status with isDefault flag.');
      if (status.isResolved)
        throw new ValidationError('Cannot create new status with isResolved flag.');
      if (status.isClosed)
        throw new ValidationError('Cannot create new status with isClosed flag.');
    }
  }

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
        // DO NOT update isDefault, isResolved, isClosed
        updatedAt: new Date()
      }
    })
    .returning();

  if (!created || created.length === 0)
    throw new AppError('Something went wrong while inserting fields into the database.', 500);

  return json({
    success: true,
    data: created,
  }, { status: 201 });
};
