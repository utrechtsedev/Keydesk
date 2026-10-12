import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as schema from '#lib/server/db/schema/index.js';
import { requireAuth } from '#lib/server/auth.js';
import { signConnectState } from '#lib/server/mail/connect-state.js';
import { callbackUrl, failedConnection, type ConnectState } from '#lib/server/mail/connect.js';
import {
	microsoftConfigured,
	microsoftLoginOrigin,
	signInUrl
} from '#lib/server/mail/microsoft.js';

/**
 * Starts connecting a Microsoft 365 mailbox: the admin signs in with Microsoft first, then grants
 * Keydesk access (see callback/+server.ts)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = requireAuth(locals);
	if (!microsoftConfigured()) {
		redirect(303, failedConnection('Connecting Microsoft 365 is not set up for this Keydesk.'));
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
	redirect(303, signInUrl(state, callbackUrl('microsoft')), { external: [microsoftLoginOrigin()] });
};
