import type { LayoutServerLoad } from './$types';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';
import { requireAuth } from '$lib/server/auth-helpers';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, session } = requireAuth(locals);

	const notifications = await db.query.userNotification.findMany({
		where: and(
			eq(schema.userNotification.userId, user.id),
			eq(schema.userNotification.isRead, false)
		),
		with: {
			notification: true
		},
		orderBy: desc(schema.userNotification.createdAt),
		limit: 99
	});

	return {
		user,
		session,
		notifications
	};
};
