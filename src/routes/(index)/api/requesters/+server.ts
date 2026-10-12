import * as schema from '#lib/server/db/schema/index.js';
import { ValidationError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { or, ilike, asc } from 'drizzle-orm';
import { requireAuth } from '#lib/server/auth.js';

export const GET: RequestHandler = async ({ url, locals }) => {
  const { db } = requireAuth(locals);
  const search = url.searchParams.get('search') || '';
  const limit = Number(url.searchParams.get('limit')) || 20;

  if (limit < 1 || limit > 100)
    throw new ValidationError('Limit must be between 1 and 100');

  if (search.length > 100)
    throw new ValidationError('Search query is too long');

  const searchPattern = `%${search}%`;

  const requesters = await db
    .select()
    .from(schema.requester)
    .where(
      search ? or(
        ilike(schema.requester.name, searchPattern),
        ilike(schema.requester.email, searchPattern),
        ilike(schema.requester.phone, searchPattern)
      ) : undefined
    )
    .orderBy(asc(schema.requester.name))
    .limit(limit);

  return Response.json({
    requesters
  });
};
