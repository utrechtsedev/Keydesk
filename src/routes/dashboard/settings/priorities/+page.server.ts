import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:priorities');
	const priorities = await db.select().from(schema.priority);

	return {
		priorities
	};
};
