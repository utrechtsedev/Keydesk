import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '#lib/server/auth.js';
import {
	getOrganizationSettings,
	updateOrganizationSettings
} from '#lib/server/services/organization.service.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const settings = await schema.validate(schema.organizationSettingsSchema)(request);

	const updated = await updateOrganizationSettings(db, user.organizationId, settings);

	return Response.json({
		success: true,
		data: updated
	});
};

export const GET: RequestHandler = async ({ locals }) => {
	const { user, db } = requireAuth(locals);

	return Response.json({
		success: true,
		data: await getOrganizationSettings(db, user.organizationId)
	});
};
