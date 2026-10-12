import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ depends, locals }) => {
	const { db } = requireAuth(locals);
	depends('app:statuses');
	const statuses = await db.select().from(schema.status);

	return {
		statuses
	};
};
