import * as schema from '#lib/server/db/schema/index.js';
import type { LayoutServerLoad } from '../$types';
import { requireAuth } from '#lib/server/auth.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { db } = requireAuth(locals);
  const priorities = await db.select().from(schema.priority);
  const users = await db.select().from(schema.user);
  const statuses = await db.select().from(schema.status);
  const categories = await db.select().from(schema.category);
  const tags = await db.select().from(schema.tag);

  return {
    priorities,
    users,
    statuses,
    categories,
    tags
  };
};
