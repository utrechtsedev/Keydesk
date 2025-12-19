import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
  const statuses = await db
    .select()
    .from(schema.status);

  return {
    statuses
  };
};





