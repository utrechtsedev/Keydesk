import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '#lib/server/auth.js';
import { getTicketSettings, saveTicketSettings } from '#lib/server/services/ticket.service.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const tickets = await schema.validate(schema.ticketConfigSchema)(request);

	return Response.json({
		success: true,
		data: await saveTicketSettings(db, user.organizationId, tickets)
	});
};

export const GET: RequestHandler = async ({ locals }) => {
	const { user, db } = requireAuth(locals);

	return Response.json({
		success: true,
		data: await getTicketSettings(db, user.organizationId)
	});
};
