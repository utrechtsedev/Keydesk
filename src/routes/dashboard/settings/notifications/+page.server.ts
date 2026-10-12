import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
  const { db } = requireAuth(locals);
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
