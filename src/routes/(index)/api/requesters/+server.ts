import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { or, ilike, asc } from "drizzle-orm";

export const GET: RequestHandler = async ({ url }) => {
  const search = url.searchParams.get('search') || '';
  const limit = Number(url.searchParams.get('limit')) || 20;

  if (limit < 1 || limit > 100)
    throw new ValidationError('Limit must be between 1 and 100')

  if (search.length > 100)
    throw new ValidationError('Search query is too long')

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

  return json({
    requesters
  });
};
