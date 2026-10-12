import { decrypt, encrypt } from '#lib/server/db/encrypt.js';
import type { MailServer } from '#lib/server/db/schema/index.js';

/** How Keydesk reads and sends a mailbox's email over IMAP and SMTP */
export interface ImapCredentials {
	provider: 'imap';
	imap: MailServer;
	smtp: MailServer;
}

export type MailboxCredentials = ImapCredentials;

/** Encrypts a mailbox's credentials for the `credentials` column */
export function sealCredentials(credentials: MailboxCredentials): string {
	return encrypt(JSON.stringify(credentials));
}

export function openCredentials(sealed: string): MailboxCredentials {
	return JSON.parse(decrypt(sealed)) as MailboxCredentials;
}
