import { optionalSetting, setting } from '#lib/server/settings.js';
import type { IncomingEmail } from './incoming.js';

/**
 * Microsoft's endpoints. The tests point these at a stand-in for Microsoft through
 * MICROSOFT_LOGIN_URL and MICROSOFT_GRAPH_URL.
 */
const loginUrl = () => process.env.MICROSOFT_LOGIN_URL || 'https://login.microsoftonline.com';
const graphUrl = () => process.env.MICROSOFT_GRAPH_URL || 'https://graph.microsoft.com/v1.0';

/** The largest message read; see MAX_MESSAGE_BYTES in imap.ts */
const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;

/** Where the sign-in and consent pages are, which connecting redirects to */
export function microsoftLoginOrigin(): string {
	return new URL(loginUrl()).origin;
}

/** Whether Keydesk has an app registration at Microsoft to connect mailboxes with */
export function microsoftConfigured(): boolean {
	return (
		optionalSetting('MICROSOFT_CLIENT_ID') !== null &&
		optionalSetting('MICROSOFT_CLIENT_SECRET') !== null
	);
}

async function tokenRequest(tenant: string, form: Record<string, string>): Promise<unknown> {
	const response = await fetch(`${loginUrl()}/${tenant}/oauth2/v2.0/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: setting('MICROSOFT_CLIENT_ID'),
			client_secret: setting('MICROSOFT_CLIENT_SECRET'),
			...form
		})
	});
	const body = (await response.json()) as { error_description?: string; error?: string };
	if (!response.ok) {
		throw new Error(
			`Microsoft sign-in: ${body.error_description ?? body.error ?? response.status}`
		);
	}
	return body;
}

/**
 * Connecting, step 1: an admin signs in with Microsoft. The ID token Microsoft then issues to
 * Keydesk names the admin's tenant; the `tenant` that step 2 redirects back with can't be trusted,
 * as anyone can type it into the address bar.
 */
export function signInUrl(state: string, redirectUri: string): string {
	const params = new URLSearchParams({
		client_id: setting('MICROSOFT_CLIENT_ID'),
		response_type: 'code',
		redirect_uri: redirectUri,
		response_mode: 'query',
		scope: 'openid profile',
		prompt: 'select_account',
		state
	});
	return `${loginUrl()}/organizations/oauth2/v2.0/authorize?${params}`;
}

/** The tenant of the account that signed in, from the ID token Microsoft gives for the code */
export async function signedInTenant(code: string, redirectUri: string): Promise<string> {
	const tokens = (await tokenRequest('organizations', {
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri,
		scope: 'openid profile'
	})) as { id_token?: string };

	// Straight from Microsoft's token endpoint over TLS, so its signature needn't be checked
	// (OpenID Connect Core 3.1.3.7); its audience still has to be Keydesk
	const payload = tokens.id_token?.split('.')[1];
	const claims = payload
		? (JSON.parse(Buffer.from(payload, 'base64url').toString()) as { aud?: string; tid?: string })
		: {};
	if (claims.aud !== setting('MICROSOFT_CLIENT_ID') || !claims.tid) {
		throw new Error('Microsoft sign-in: the ID token is not for Keydesk');
	}
	return claims.tid;
}

/**
 * Connecting, step 2: an admin of the tenant grants Keydesk the application permissions of its
 * app registration (Mail.Read and Mail.Send)
 */
export function adminConsentUrl(tenantId: string, state: string, redirectUri: string): string {
	const params = new URLSearchParams({
		client_id: setting('MICROSOFT_CLIENT_ID'),
		scope: 'https://graph.microsoft.com/.default',
		redirect_uri: redirectUri,
		state
	});
	return `${loginUrl()}/${encodeURIComponent(tenantId)}/v2.0/adminconsent?${params}`;
}

/** An access token for Keydesk's application permissions in the tenant */
async function appToken(tenantId: string): Promise<string> {
	const tokens = (await tokenRequest(encodeURIComponent(tenantId), {
		grant_type: 'client_credentials',
		scope: 'https://graph.microsoft.com/.default'
	})) as { access_token: string };
	return tokens.access_token;
}

async function graph(token: string, url: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	headers.set('authorization', `Bearer ${token}`);
	const response = await fetch(url, { ...init, headers });
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: { message?: string };
		} | null;
		throw new Error(
			`Microsoft Graph: ${body?.error?.message ?? response.statusText} (${response.status})`
		);
	}
	return response;
}

const mailboxUrl = (address: string) => `${graphUrl()}/users/${encodeURIComponent(address)}`;

/** Checks that Keydesk can read the address's inbox in the tenant */
export async function checkGraphMailbox(tenantId: string, address: string): Promise<void> {
	const token = await appToken(tenantId);
	await graph(token, `${mailboxUrl(address)}/mailFolders/inbox?$select=id`);
}

/** How far a Microsoft 365 inbox has been read: the delta link to ask for the next changes with */
export interface GraphCursor {
	link: string;
}

interface DeltaPage {
	value: { id: string; '@removed'?: unknown }[];
	'@odata.nextLink'?: string;
	'@odata.deltaLink'?: string;
}

/**
 * Reads the inbox from the cursor on with Graph's delta query, one page of at most `limit` new
 * messages per call, and hands each message's MIME source to `handle`. The cursor moves past a
 * page once all its messages are handled; a page read again after a failure gives messages the
 * archive already has, which processing skips.
 *
 * Without a cursor (a new mailbox) it reads nothing and returns a cursor at the newest message, as
 * for IMAP: older mail stays out.
 */
export async function readGraphInbox(
	tenantId: string,
	address: string,
	cursor: GraphCursor | null,
	limit: number,
	handle: (message: IncomingEmail & { cursor: GraphCursor }) => Promise<void>
): Promise<{ cursor: GraphCursor; more: boolean }> {
	const token = await appToken(tenantId);
	// Ids that don't change when a message moves, so the archive keeps recognizing it
	const prefer = { prefer: `odata.maxpagesize=${limit}, IdType="ImmutableId"` };

	if (!cursor) {
		const filter = encodeURIComponent(`receivedDateTime ge ${new Date().toISOString()}`);
		let link = `${mailboxUrl(address)}/mailFolders/inbox/messages/delta?changeType=created&$select=id&$filter=${filter}`;
		for (;;) {
			const page = (await (await graph(token, link, { headers: prefer })).json()) as DeltaPage;
			if (page['@odata.deltaLink'])
				return { cursor: { link: page['@odata.deltaLink'] }, more: false };
			if (!page['@odata.nextLink']) throw new Error('Microsoft Graph: a delta page without a link');
			link = page['@odata.nextLink'];
		}
	}

	const page = (await (await graph(token, cursor.link, { headers: prefer })).json()) as DeltaPage;
	for (const item of page.value) {
		// Deleted or moved out of the inbox, or a change that isn't a new message
		if (item['@removed']) continue;

		const response = await graph(
			token,
			`${mailboxUrl(address)}/messages/${encodeURIComponent(item.id)}/$value`,
			{ headers: { prefer: 'IdType="ImmutableId"' } }
		);
		const size = Number(response.headers.get('content-length') ?? 0);
		let raw: Uint8Array | null = null;
		if (size <= MAX_MESSAGE_BYTES) {
			raw = new Uint8Array(await response.arrayBuffer());
		} else {
			await response.body?.cancel();
		}
		await handle({ providerMessageId: item.id, size: raw?.length ?? size, raw, cursor });
	}

	const next = page['@odata.nextLink'] ?? page['@odata.deltaLink'];
	if (!next) throw new Error('Microsoft Graph: a delta page without a link');
	return { cursor: { link: next }, more: page['@odata.nextLink'] !== undefined };
}

/** Sends a complete MIME message from the address; Graph keeps a copy in its Sent Items */
export async function sendGraphMail(
	tenantId: string,
	address: string,
	mime: Uint8Array
): Promise<void> {
	const token = await appToken(tenantId);
	await graph(token, `${mailboxUrl(address)}/sendMail`, {
		method: 'POST',
		headers: { 'content-type': 'text/plain' },
		body: Buffer.from(mime).toString('base64')
	});
}
