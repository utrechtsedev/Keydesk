import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { IMAP } from '#lib/types/index.js';
import { decrypt } from '#lib/server/db/encrypt.js';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
  const { db } = requireAuth(locals);
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'imap'));

  // Not configured yet: start from an empty form
  if (!config) {
    const imap: IMAP = { host: '', port: 993, SSL: true, username: '', password: '' };
    return { imap };
  }

  const response: IMAP = config.value as IMAP;
  response.password = decrypt(response.password);

  return {
    imap: response,
  };
};
