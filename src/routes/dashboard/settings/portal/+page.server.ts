import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'portal'));

  if (!config) {
    return {
      portal: null,
    };
  }

  return {
    portal: config.value,
  };
};
