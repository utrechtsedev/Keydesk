import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { getOrganizationSettings } from '#lib/server/services/organization.service.js';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, db } = requireAuth(locals);

	return {
		organization: await getOrganizationSettings(db, user.organizationId)
	};
};
