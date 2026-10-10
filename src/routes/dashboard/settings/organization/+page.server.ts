import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'organization'));

  if (!config) {
    return {
      organization: null,
    };
  }

  return {
    organization: config.value,
  };
};
