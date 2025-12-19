import type { PageServerLoad } from './$types';
import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';

export const load: PageServerLoad = async () => {
  const categories = await db
    .select()
    .from(schema.category);

  return {
    categories,
  };
};
