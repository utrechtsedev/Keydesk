import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { invitationExpiries } from '#lib/server/services/invitation.service.js';

export const load: PageServerLoad = async ({ depends, locals }) => {
	const { db } = requireAuth(locals);
	depends('app:users');
	const users = await db.query.user.findMany({
		orderBy: (user, { asc }) => [asc(user.id)]
	});
	const invitations = await invitationExpiries(db);

	return {
		users: users.map((user) => ({
			...user,
			/** Set while the user hasn't accepted their invitation */
			invitationExpiresAt: invitations.get(user.id) ?? null
		}))
	};
};
