import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:users');
	const users = await db.query.user.findMany({
		orderBy: (user, { asc }) => [asc(user.id)]
	});

	return {
		users
	};
};
