import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { db } from '#lib/server/db/database.js';

export const load: PageServerLoad = async ({ depends }) => {
  depends('app:categories');
  const categories = await db
    .select()
    .from(schema.category);

  return {
    categories,
  };
};
