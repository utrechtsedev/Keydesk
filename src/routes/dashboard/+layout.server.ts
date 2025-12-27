import type { LayoutServerLoad } from './$types';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';
import { requireAuth } from '$lib/server/auth-helper';
import { redirect } from '@sveltejs/kit';

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
	const organization = await db.query.config.findFirst({
		where: (config, { eq }) => eq(config.key, 'organization')
	});

	if (!organization) throw redirect(303, '/setup');

	return {
		user,
		session,
		notifications,
		organization: organization.value
	};
};
