import { optionalSetting, setting } from '#lib/server/settings.js';
import type { IncomingEmail } from './incoming.js';

/**
 * Google's endpoints. The tests point these at a stand-in for Google through GOOGLE_AUTH_URL,
 * GOOGLE_TOKEN_URL and GOOGLE_GMAIL_URL.
 */
const authUrl = () => process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
const tokenUrl = () => process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const gmailUrl = () =>
	process.env.GOOGLE_GMAIL_URL || 'https://gmail.googleapis.com/gmail/v1/users/me';

/** Reading the inbox and sending as the account; nothing more */
const SCOPES = [
	'openid',
	'email',
	'https://www.googleapis.com/auth/gmail.readonly',
	'https://www.googleapis.com/auth/gmail.send'
];

/** The largest message read; see MAX_MESSAGE_BYTES in imap.ts */
const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;

/** Where the consent page is, which connecting redirects to */
export function googleAuthOrigin(): string {
	return new URL(authUrl()).origin;
}

/** Whether Keydesk has an OAuth client at Google to connect mailboxes with */
export function googleConfigured(): boolean {
	return (
		optionalSetting('GOOGLE_CLIENT_ID') !== null && optionalSetting('GOOGLE_CLIENT_SECRET') !== null
	);
}

/**
 * Connecting: the account's owner signs in at Google and lets Keydesk read and send its email.
 * `access_type=offline` and `prompt=consent` make Google hand out a refresh token every time.
 */
export function consentUrl(state: string, redirectUri: string, address: string): string {
	const params = new URLSearchParams({
		client_id: setting('GOOGLE_CLIENT_ID'),
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: SCOPES.join(' '),
		access_type: 'offline',
		prompt: 'consent',
		login_hint: address,
		state
	});
	return `${authUrl()}?${params}`;
}

async function tokenRequest(form: Record<string, string>): Promise<Record<string, unknown>> {
	const response = await fetch(tokenUrl(), {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: setting('GOOGLE_CLIENT_ID'),
			client_secret: setting('GOOGLE_CLIENT_SECRET'),
			...form
		})
	});
	const body = (await response.json()) as Record<string, unknown>;
	if (!response.ok) {
		if (body.error === 'invalid_grant') {
			throw new Error('Google: access was withdrawn or expired; connect the mailbox again');
		}
		throw new Error(`Google: ${body.error_description ?? body.error ?? response.status}`);
	}
	return body;
}

/**
 * The account that signed in, from the ID token Google gives for the code, and the refresh token
 * Keydesk keeps to read and send its email
 */
export async function exchangeCode(
	code: string,
	redirectUri: string
): Promise<{ address: string; refreshToken: string }> {
	const tokens = await tokenRequest({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri
	});

	// Straight from Google's token endpoint over TLS, so its signature needn't be checked
	// (OpenID Connect Core 3.1.3.7); its audience still has to be Keydesk
	const payload = typeof tokens.id_token === 'string' ? tokens.id_token.split('.')[1] : undefined;
	const claims = payload
		? (JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
				aud?: string;
				email?: string;
				email_verified?: boolean;
			})
		: {};
	if (claims.aud !== setting('GOOGLE_CLIENT_ID') || !claims.email || !claims.email_verified) {
		throw new Error('Google sign-in: the ID token is not for Keydesk');
	}
	if (typeof tokens.refresh_token !== 'string') {
		throw new Error("Google didn't give Keydesk lasting access. Try connecting again.");
	}
	return { address: claims.email.toLowerCase(), refreshToken: tokens.refresh_token };
}

async function accessToken(refreshToken: string): Promise<string> {
	const tokens = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
	return tokens.access_token as string;
}

class GmailError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

async function gmail<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	headers.set('authorization', `Bearer ${token}`);
	const response = await fetch(`${gmailUrl()}${path}`, { ...init, headers });
	const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
	if (!response.ok) {
		throw new GmailError(
			`Gmail: ${body?.error?.message ?? response.statusText} (${response.status})`,
			response.status
		);
	}
	return body as T;
}

/** Checks that Keydesk can read the account's mail */
export async function checkGmail(refreshToken: string): Promise<void> {
	await gmail(await accessToken(refreshToken), '/profile');
}

/**
 * How far a Gmail inbox has been read: the history record to continue after. After Google forgot
 * that history, `backlog` holds the messages still to read since the last sync.
 */
export interface GmailCursor {
	historyId: string;
	backlog?: string[];
}

interface HistoryPage {
	history?: { id: string; messagesAdded?: { message: { id: string } }[] }[];
	nextPageToken?: string;
	historyId: string;
}

/**
 * Reads the inbox from the cursor on with Gmail's history, at most `limit` new messages per call,
 * and hands each message's source to `handle`, saving the cursor past each history record.
 *
 * Without a cursor (a new mailbox) it reads nothing and returns the current history id: older mail
 * stays out. Gmail keeps history for about a week; when it no longer has the cursor's, the inbox's
 * messages since `since` are read instead, skipping those already processed.
 */
export async function readGmailInbox(
	refreshToken: string,
	cursor: GmailCursor | null,
	since: Date | null,
	limit: number,
	handle: (message: IncomingEmail & { cursor: GmailCursor }) => Promise<void>
): Promise<{ cursor: GmailCursor; more: boolean }> {
	const token = await accessToken(refreshToken);
	const current = async () => (await gmail<{ historyId: string }>(token, '/profile')).historyId;

	if (!cursor) return { cursor: { historyId: await current() }, more: false };

	const read = async (id: string, position: GmailCursor) => {
		const { sizeEstimate } = await gmail<{ sizeEstimate: number }>(
			token,
			`/messages/${encodeURIComponent(id)}?format=minimal`
		);
		const raw =
			sizeEstimate <= MAX_MESSAGE_BYTES
				? Buffer.from(
						(await gmail<{ raw: string }>(token, `/messages/${encodeURIComponent(id)}?format=raw`))
							.raw,
						'base64url'
					)
				: null;
		await handle({
			providerMessageId: id,
			size: raw?.length ?? sizeEstimate,
			raw: raw ? new Uint8Array(raw) : null,
			cursor: position
		});
	};

	// Messages left over from a history Google no longer had, oldest first
	if (cursor.backlog?.length) {
		const batch = cursor.backlog.slice(0, limit);
		let position = cursor;
		for (const [index, id] of batch.entries()) {
			position = { historyId: cursor.historyId, backlog: cursor.backlog.slice(index + 1) };
			await read(id, position);
		}
		return {
			cursor: position.backlog?.length ? position : { historyId: cursor.historyId },
			more: (position.backlog?.length ?? 0) > 0
		};
	}

	let page: HistoryPage;
	try {
		const params = new URLSearchParams({
			startHistoryId: cursor.historyId,
			historyTypes: 'messageAdded',
			labelId: 'INBOX',
			maxResults: String(limit)
		});
		page = await gmail<HistoryPage>(token, `/history?${params}`);
	} catch (error) {
		if (!(error instanceof GmailError && error.status === 404)) throw error;
		return { cursor: await rebuild(token, since, await current()), more: true };
	}

	let position: GmailCursor = cursor;
	let handled = 0;
	for (const record of page.history ?? []) {
		const ids = [...new Set((record.messagesAdded ?? []).map((added) => added.message.id))];
		// A record is handled whole, so the cursor never points into the middle of one
		if (handled > 0 && handled + ids.length > limit) {
			return { cursor: position, more: true };
		}
		position = { historyId: record.id };
		for (const id of ids) await read(id, position);
		handled += ids.length;
	}

	return page.nextPageToken
		? { cursor: position, more: true }
		: { cursor: { historyId: page.historyId }, more: false };
}

/** The inbox's messages since `since`, oldest first, to read after Gmail forgot the history */
async function rebuild(token: string, since: Date | null, historyId: string): Promise<GmailCursor> {
	const after = Math.floor((since?.getTime() ?? Date.now()) / 1000);
	const ids: string[] = [];
	let pageToken: string | undefined;
	do {
		const params = new URLSearchParams({
			labelIds: 'INBOX',
			q: `after:${after}`,
			maxResults: '500'
		});
		if (pageToken) params.set('pageToken', pageToken);
		const page = await gmail<{ messages?: { id: string }[]; nextPageToken?: string }>(
			token,
			`/messages?${params}`
		);
		ids.push(...(page.messages ?? []).map((message) => message.id));
		pageToken = page.nextPageToken;
	} while (pageToken);
	// Gmail lists the newest first
	return { historyId, backlog: ids.reverse() };
}

/**
 * Sends a complete MIME message from the account and returns the Message-ID it went out with,
 * as Gmail has it: Gmail doesn't promise to keep the one in the message
 */
export async function sendGmail(refreshToken: string, mime: Uint8Array): Promise<string | null> {
	const token = await accessToken(refreshToken);
	const { id } = await gmail<{ id: string }>(token, '/messages/send', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') })
	});
	const sent = await gmail<{ payload?: { headers?: { name: string; value: string }[] } }>(
		token,
		`/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Message-ID`
	);
	return (
		sent.payload?.headers?.find((header) => header.name.toLowerCase() === 'message-id')?.value ??
		null
	);
}
