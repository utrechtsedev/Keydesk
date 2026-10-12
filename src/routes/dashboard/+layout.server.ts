import type { LayoutServerLoad } from './$types';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';
import { requireAuth } from '#lib/server/auth.js';
import { getOrganizationSettings } from '#lib/server/services/organization.service.js';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:root');
	const { user, session, db } = requireAuth(locals);

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
	const organization = await getOrganizationSettings(db, user.organizationId);

	return {
		user,
		session,
		notifications,
		organization
	};
};
