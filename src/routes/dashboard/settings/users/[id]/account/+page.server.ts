import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ depends, params, locals }) => {
	const { db } = requireAuth(locals);
	const id = Number(params.id);
	depends('app:user');

	const targetUser = await db.query.user.findFirst({
		where: (users, { eq }) => eq(users.id, id)
	});
	return {
		targetUser
	};
};
