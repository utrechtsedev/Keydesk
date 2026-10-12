import { setting } from '#lib/server/settings.js';

/** How long an admin has to finish connecting a mailbox at Microsoft or Google */
const LIFETIME_MS = 15 * 60 * 1000;

function base64url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('base64url');
}

async function key(): Promise<CryptoKey> {
	// Its own key, derived from the app secret, so these signatures can't stand in for others
	const material = new TextEncoder().encode(
		`keydesk:mailbox-connect:${setting('BETTER_AUTH_SECRET')}`
	);
	const digest = await crypto.subtle.digest('SHA-256', material);
	return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign',
		'verify'
	]);
}

/**
 * Signs what connecting a mailbox has to remember across the redirects to a provider and back, as
 * the `state` parameter of those redirects. It expires after 15 minutes.
 */
export async function signConnectState(payload: object): Promise<string> {
	const body = base64url(
		new TextEncoder().encode(JSON.stringify({ ...payload, expiresAt: Date.now() + LIFETIME_MS }))
	);
	const signature = await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(body));
	return `${body}.${base64url(new Uint8Array(signature))}`;
}

/** The payload of a state this app signed and that hasn't expired, or null */
export async function verifyConnectState<T extends object>(
	state: string | null
): Promise<T | null> {
	const [body, signature] = state?.split('.') ?? [];
	if (!body || !signature) return null;

	const valid = await crypto.subtle.verify(
		'HMAC',
		await key(),
		Buffer.from(signature, 'base64url'),
		new TextEncoder().encode(body)
	);
	if (!valid) return null;

	const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & {
		expiresAt: number;
	};
	return payload.expiresAt > Date.now() ? payload : null;
}
