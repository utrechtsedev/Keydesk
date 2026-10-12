import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { getTicketSettings } from '#lib/server/services/ticket.service.js';

export const load: PageServerLoad = async ({ locals }) => {
  const { user, db } = requireAuth(locals);

  return {
    tickets: await getTicketSettings(db, user.organizationId)
  };
};
