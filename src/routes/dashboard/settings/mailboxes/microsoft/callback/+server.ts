import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { signConnectState, verifyConnectState } from '#lib/server/mail/connect-state.js';
import {
	callbackUrl,
	connected,
	failedConnection,
	type ConnectState
} from '#lib/server/mail/connect.js';
import { saveMicrosoftMailbox } from '#lib/server/mail/mailboxes.js';
import {
	adminConsentUrl,
	checkGraphMailbox,
	microsoftLoginOrigin,
	signedInTenant
} from '#lib/server/mail/microsoft.js';
import { queueJob } from '#lib/server/queue.js';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Where Microsoft sends the admin back to, after the sign-in and again after the consent */
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
			failedConnection(`Microsoft: ${url.searchParams.get('error_description') ?? error}`)
		);
	}

	if (state.step === 'sign-in') {
		let tenantId: string;
		try {
			tenantId = await signedInTenant(url.searchParams.get('code') ?? '', callbackUrl('microsoft'));
		} catch (failure) {
			redirect(303, failedConnection(reason(failure)));
		}
		const next = await signConnectState({
			...state,
			step: 'consent',
			tenantId
		} satisfies ConnectState);
		redirect(303, adminConsentUrl(tenantId, next, callbackUrl('microsoft')), {
			external: [microsoftLoginOrigin()]
		});
	}

	if (url.searchParams.get('admin_consent') !== 'True' || !state.tenantId) {
		redirect(303, failedConnection('Microsoft: the permissions were not granted.'));
	}

	// The tenant comes from the ID token of the sign-in, kept in the signed state; the `tenant`
	// Microsoft adds to this address could have been changed by anyone
	const { tenantId, mailbox } = state;
	try {
		await checkGraphMailbox(tenantId, mailbox.address);
	} catch (failure) {
		redirect(
			303,
			failedConnection(
				`Keydesk can't read ${mailbox.address} in this Microsoft 365 organization: ${reason(failure)}`
			)
		);
	}

	const saved = await saveMicrosoftMailbox(db, mailbox, { provider: 'microsoft', tenantId });
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
