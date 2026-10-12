import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { renewInvitation, sendInvitation } from '#lib/server/services/invitation.service.js';

/** Sends a pending user a new invitation link; the previous link stops working */
export const POST: RequestHandler = async ({ params, locals, url }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);

	const [invitee] = await db
		.select({ name: schema.user.name, email: schema.user.email })
		.from(schema.user)
		.where(eq(schema.user.id, id));
	if (!invitee) {
		return Response.json({ message: 'User not found.' }, { status: 404 });
	}

	const token = await renewInvitation(db, id);
	if (!token) {
		return Response.json(
			{ message: `${invitee.name} has already accepted the invitation.` },
			{ status: 409 }
		);
	}

	const invitationUrl = new URL(`/invitation/${token}`, url).href;
	const emailSent = await sendInvitation(db, user.organizationId, {
		...invitee,
		invitedBy: user.name,
		url: invitationUrl
	});

	return Response.json({
		success: true,
		emailSent,
		invitationUrl: emailSent ? undefined : invitationUrl
	});
};
