import { ImapFlow } from 'imapflow';
import type { MailServer } from '#lib/server/db/schema/index.js';

/** How far an IMAP inbox has been read; UIDs only mean something within one UIDVALIDITY */
export interface ImapCursor {
	uidValidity: string;
	lastUid: number;
}

export interface ImapMessage {
	/** Unique within the mailbox: `<uidvalidity>:<uid>` */
	providerMessageId: string;
	/** The cursor once this message is handled */
	cursor: ImapCursor;
	size: number;
	/** The message source, or null when it is larger than Keydesk reads */
	raw: Uint8Array | null;
}

/**
 * The largest message read. A Worker has 128 MB of memory, and parsing a message holds it more
 * than once.
 */
export const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;

function client(server: MailServer): ImapFlow {
	return new ImapFlow({
		host: server.host,
		port: server.port,
		secure: server.secure,
		auth: { user: server.username, pass: server.password },
		logger: false,
		connectionTimeout: 15_000,
		greetingTimeout: 15_000,
		socketTimeout: 60_000
	});
}

/** Signs in and opens the inbox, to check settings an admin entered */
export async function testImap(server: MailServer): Promise<void> {
	const imap = client(server);
	await imap.connect();
	try {
		await imap.mailboxOpen('INBOX', { readOnly: true });
	} finally {
		await imap.logout();
	}
}

/**
 * Reads the inbox from the cursor on, oldest first, and hands each message to `handle` while the
 * connection stays open; `handle` saves the message together with its cursor. Stops after `limit`
 * messages.
 *
 * Without a cursor (a new mailbox) it reads nothing and returns the cursor at the newest message:
 * older mail stays out. When the server has renumbered the inbox (a new UIDVALIDITY), it rereads
 * what arrived since `since`; processing skips messages it already has by their Message-ID.
 */
export async function readImapInbox(
	server: MailServer,
	cursor: ImapCursor | null,
	since: Date | null,
	limit: number,
	handle: (message: ImapMessage) => Promise<void>
): Promise<{ cursor: ImapCursor; more: boolean }> {
	const imap = client(server);
	await imap.connect();
	try {
		const inbox = await imap.mailboxOpen('INBOX', { readOnly: true });
		const uidValidity = String(inbox.uidValidity);

		if (!cursor) {
			return { cursor: { uidValidity, lastUid: inbox.uidNext - 1 }, more: false };
		}

		const renumbered = cursor.uidValidity !== uidValidity;
		const found = renumbered
			? await imap.search({ since: since ?? new Date(0) }, { uid: true })
			: await imap.search({ uid: `${cursor.lastUid + 1}:*` }, { uid: true });
		// `n:*` also matches the newest message when its UID is below n
		const lastUid = renumbered ? 0 : cursor.lastUid;
		const uids = (found || []).filter((uid) => uid > lastUid).sort((a, b) => a - b);

		let position: ImapCursor = { uidValidity, lastUid };
		for (const uid of uids.slice(0, limit)) {
			const header = await imap.fetchOne(String(uid), { size: true }, { uid: true });
			const size = header ? (header.size ?? 0) : 0;
			const source =
				header && size <= MAX_MESSAGE_BYTES
					? await imap.fetchOne(String(uid), { source: true }, { uid: true })
					: false;

			position = { uidValidity, lastUid: uid };
			await handle({
				providerMessageId: `${uidValidity}:${uid}`,
				cursor: position,
				size,
				raw: source && source.source ? new Uint8Array(source.source) : null
			});
		}

		return { cursor: position, more: uids.length > limit };
	} finally {
		await imap.logout();
	}
}
