import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.session || !locals.user) return redirect(303, '/login');

  const notifications = await db.query.userNotification.findMany({
    where: and(
      eq(schema.userNotification.userId, locals.user.id),
      eq(schema.userNotification.isRead, false)
    ),
    with: {
      notification: true,
    },
    orderBy: desc(schema.userNotification.createdAt),
    limit: 99,
  });


  return {
    user: locals.user,
    notifications
  };
};
