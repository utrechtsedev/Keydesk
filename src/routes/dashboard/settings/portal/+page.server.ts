import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '#lib/server/auth.js';
import type { Portal } from '#lib/types/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const { db } = requireAuth(locals);
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'portal'));

  // Not configured yet: the portal starts switched off
  if (!config) {
    const portal: Portal = {
      enabled: false,
      allowGuestTickets: false,
      requireEmailVerification: true,
      showKnowledgeBase: false
    };
    return { portal };
  }

  return {
    portal: config.value,
  };
};
