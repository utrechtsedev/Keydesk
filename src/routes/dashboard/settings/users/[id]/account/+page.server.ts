import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';

export const load: PageServerLoad = async ({ depends, params }) => {
	const id = Number(params.id);
	depends('app:user');

	const targetUser = await db.query.user.findFirst({
		where: (users, { eq }) => eq(users.id, id)
	});
	return {
		targetUser
	};
};
