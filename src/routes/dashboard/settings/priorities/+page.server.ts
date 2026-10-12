import type { PageServerLoad } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ depends, locals }) => {
	const { db } = requireAuth(locals);
	depends('app:priorities');
	const priorities = await db.select().from(schema.priority);

	return {
		priorities
	};
};
