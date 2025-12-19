import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import type { SMTP } from '$lib/types';
import { decrypt } from '$lib/server/db/encrypt';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'smtp'));

  if (!config) {
    return {
      smtp: null,
    };
  }

  const response: SMTP = config.value as SMTP;
  if (response.password) {
    response.password = decrypt(response.password);
  }

  return {
    smtp: response,
  };
};
