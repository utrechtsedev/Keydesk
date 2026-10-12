import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ depends, locals }) => {
	const { db } = requireAuth(locals);
	depends('app:users');
	const users = await db.query.user.findMany({
		orderBy: (user, { asc }) => [asc(user.id)]
	});

	return {
		users
	};
};
