import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { verifyConnectState } from '#lib/server/mail/connect-state.js';
import {
	callbackUrl,
	connected,
	failedConnection,
	type ConnectState
} from '#lib/server/mail/connect.js';
import { checkGmail, exchangeCode } from '#lib/server/mail/google.js';
import { saveConnectedMailbox } from '#lib/server/mail/mailboxes.js';
import { queueJob } from '#lib/server/queue.js';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Where Google sends the account's owner back to, with a code for Keydesk's tokens */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user, db } = requireAuth(locals);
	const state = await verifyConnectState<ConnectState>(url.searchParams.get('state'));
	if (!state || state.userId !== user.id || state.organizationId !== user.organizationId) {
		redirect(303, failedConnection('This connection expired or was started elsewhere. Try again.'));
	}

	const error = url.searchParams.get('error');
	if (error) {
		redirect(
			303,
			failedConnection(`Google: ${error === 'access_denied' ? 'access was not granted.' : error}`)
		);
	}

	let account: { address: string; refreshToken: string };
	try {
		account = await exchangeCode(url.searchParams.get('code') ?? '', callbackUrl('google'));
		await checkGmail(account.refreshToken);
	} catch (failure) {
		redirect(303, failedConnection(reason(failure)));
	}

	// The address comes from the ID token Google issued, so it is the account that signed in
	const { mailbox } = state;
	if (account.address !== mailbox.address) {
		redirect(
			303,
			failedConnection(`You signed in to Google as ${account.address}, not ${mailbox.address}.`)
		);
	}

	const saved = await saveConnectedMailbox(db, mailbox, {
		provider: 'google',
		refreshToken: account.refreshToken
	});
	if (!saved.ok) {
		redirect(303, failedConnection(saved.message));
	}
	queueJob(locals, {
		type: 'mailbox-sync',
		organizationId: user.organizationId,
		mailboxId: saved.mailbox.id
	});
	redirect(303, connected(mailbox.address));
};
