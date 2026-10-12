import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { inviteUser, sendInvitation } from '#lib/server/services/invitation.service.js';

/** Invites someone to the organization: a user without a password, who gets a link to set one */
export const POST: RequestHandler = async ({ request, locals, url }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const parsed = schema.inviteUserSchema.safeParse(await request.json());
	if (!parsed.success) {
		return Response.json({ message: parsed.error.issues[0].message }, { status: 400 });
	}

	const invited = await inviteUser(db, parsed.data);
	if (!invited) {
		return Response.json(
			{ message: 'A user with this email address already exists.' },
			{ status: 409 }
		);
	}

	const invitationUrl = new URL(`/invitation/${invited.token}`, url).href;
	const emailSent = await sendInvitation(db, user.organizationId, {
		name: invited.user.name,
		email: invited.user.email,
		invitedBy: user.name,
		url: invitationUrl
	});

	return Response.json(
		{
			success: true,
			data: invited.user,
			emailSent,
			// Without the email, the admin passes the link on
			invitationUrl: emailSent ? undefined : invitationUrl
		},
		{ status: 201 }
	);
};
