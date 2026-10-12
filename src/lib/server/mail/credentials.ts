import { decrypt, encrypt } from '#lib/server/db/encrypt.js';
import type { MailServer } from '#lib/server/db/schema/index.js';

/** How Keydesk reads and sends a mailbox's email over IMAP and SMTP */
export interface ImapCredentials {
	provider: 'imap';
	imap: MailServer;
	smtp: MailServer;
}

/**
 * A Microsoft 365 mailbox, read and sent through Microsoft Graph with Keydesk's own application
 * permissions in the customer's tenant, which its admin granted when connecting it
 */
export interface MicrosoftCredentials {
	provider: 'microsoft';
	tenantId: string;
}

/**
 * A Gmail or Google Workspace mailbox, read and sent through the Gmail API with the refresh token
 * the account's owner gave Keydesk when connecting it
 */
export interface GoogleCredentials {
	provider: 'google';
	refreshToken: string;
}

export type MailboxCredentials = ImapCredentials | MicrosoftCredentials | GoogleCredentials;

/** Encrypts a mailbox's credentials for the `credentials` column */
export function sealCredentials(credentials: MailboxCredentials): string {
	return encrypt(JSON.stringify(credentials));
}

export function openCredentials(sealed: string): MailboxCredentials {
	return JSON.parse(decrypt(sealed)) as MailboxCredentials;
}
