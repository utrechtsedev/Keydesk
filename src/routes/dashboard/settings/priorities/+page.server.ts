import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:priorities');
	const priorities = await db.select().from(schema.priority);

	return {
		priorities
	};
};
