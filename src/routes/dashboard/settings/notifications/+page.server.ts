import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'notifications'));

  if (!config) {
    return {
      notificationConfig: null,
    };
  }

  return {
    notificationConfig: config.value,
  };
};
