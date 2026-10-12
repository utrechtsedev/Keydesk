import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import type { SMTP } from '#lib/types/index.js';
import { decrypt } from '#lib/server/db/encrypt.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
  const { db } = requireAuth(locals);
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'smtp'));

  // Not configured yet: start from an empty form
  if (!config) {
    const smtp: SMTP = {
      senderName: '',
      senderEmail: '',
      host: '',
      port: 587,
      SSL: false,
      enableAuthentication: true,
      username: '',
      password: ''
    };
    return { smtp };
  }

  const response: SMTP = config.value as SMTP;
  if (response.password) {
    response.password = decrypt(response.password);
  }

  return {
    smtp: response,
  };
};
