import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:statuses');
	const statuses = await db.select().from(schema.status);

	return {
		statuses
	};
};
