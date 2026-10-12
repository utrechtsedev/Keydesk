import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { requireAuth } from '#lib/server/auth.js';
import { signConnectState } from '#lib/server/mail/connect-state.js';
import { callbackUrl, failedConnection, type ConnectState } from '#lib/server/mail/connect.js';
import { consentUrl, googleAuthOrigin, googleConfigured } from '#lib/server/mail/google.js';

/** Starts connecting a Gmail mailbox: its account signs in at Google and lets Keydesk in */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = requireAuth(locals);
	if (!googleConfigured()) {
		redirect(303, failedConnection('Connecting Gmail is not set up for this Keydesk.'));
	}
	const parsed = schema.connectMailboxSchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		redirect(303, failedConnection(parsed.error.issues[0].message));
	}

	const state = await signConnectState({
		step: 'sign-in',
		organizationId: user.organizationId,
		userId: user.id,
		mailbox: parsed.data
	} satisfies ConnectState);
	redirect(303, consentUrl(state, callbackUrl('google'), parsed.data.address), {
		external: [googleAuthOrigin()]
	});
};
