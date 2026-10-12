import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ depends, locals }) => {
  const { db } = requireAuth(locals);
  depends('app:categories');
  const categories = await db
    .select()
    .from(schema.category);

  return {
    categories,
  };
};
