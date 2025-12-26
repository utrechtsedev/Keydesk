import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:users');
	const users = await db.select().from(schema.user);

	return {
		users
	};
};
