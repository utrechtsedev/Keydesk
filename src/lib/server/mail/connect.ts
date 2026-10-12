import type { ConnectMailbox } from '#lib/server/db/schema/index.js';
import { setting } from '#lib/server/settings.js';

/** What connecting a mailbox at a provider remembers between the redirects; see connect-state.ts */
export interface ConnectState {
	step: 'sign-in' | 'consent';
	organizationId: number;
	userId: number;
	mailbox: ConnectMailbox;
	/** Known after the sign-in, from the provider's ID token */
	tenantId?: string;
}

const MAILBOXES = '/dashboard/settings/mailboxes';

/** Where a provider sends the admin back to; it must be registered with the provider */
export function callbackUrl(provider: 'microsoft' | 'google'): string {
	return `${setting('APP_URL')}${MAILBOXES}/${provider}/callback`;
}

/** Back to the mailboxes, telling what went wrong */
export function failedConnection(message: string): string {
	return `${MAILBOXES}?error=${encodeURIComponent(message)}`;
}

/** Back to the mailboxes, with the address that is now connected */
export function connected(address: string): string {
	return `${MAILBOXES}?connected=${encodeURIComponent(address)}`;
}
