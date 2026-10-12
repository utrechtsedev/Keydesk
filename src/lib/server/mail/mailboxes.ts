import { asc, eq } from 'drizzle-orm';
import type { TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { ImapMailboxInput, MailServer } from '#lib/server/db/schema/index.js';
import { isUniqueViolation } from '#lib/server/services/user.service.js';
import { openCredentials, sealCredentials, type MailboxCredentials } from './credentials.js';

/** A mail server as the settings screen shows it: without its password */
export type MailServerView = Omit<MailServer, 'password'> & { hasPassword: boolean };

/** A mailbox as the settings screen shows it; credentials never leave the server */
export interface MailboxView {
	id: number;
	name: string;
	address: string;
	provider: 'imap' | 'microsoft' | 'google';
	imap: MailServerView;
	smtp: MailServerView;
	pollIntervalSeconds: number;
	enabled: boolean;
	lastSyncedAt: Date | null;
	nextSyncAt: Date | null;
	errorCount: number;
	lastError: string | null;
}

function serverView({ password, ...server }: MailServer): MailServerView {
	return { ...server, hasPassword: password.length > 0 };
}

export function mailboxView(mailbox: schema.Mailbox): MailboxView {
	const credentials = openCredentials(mailbox.credentials);
	return {
		id: mailbox.id,
		name: mailbox.name,
		address: mailbox.address,
		provider: mailbox.provider,
		imap: serverView(credentials.imap),
		smtp: serverView(credentials.smtp),
		pollIntervalSeconds: mailbox.pollIntervalSeconds,
		enabled: mailbox.enabled,
		lastSyncedAt: mailbox.lastSyncedAt,
		nextSyncAt: mailbox.nextSyncAt,
		errorCount: mailbox.errorCount,
		lastError: mailbox.lastError
	};
}

export async function listMailboxes(db: TenantDb): Promise<MailboxView[]> {
	const mailboxes = await db.select().from(schema.mailbox).orderBy(asc(schema.mailbox.id));
	return mailboxes.map(mailboxView);
}

export async function findMailbox(db: TenantDb, id: number): Promise<schema.Mailbox | null> {
	const [mailbox] = await db.select().from(schema.mailbox).where(eq(schema.mailbox.id, id));
	return mailbox ?? null;
}

/** An empty password keeps the one stored before, so the settings screen never needs to show it */
function keepPassword(entered: MailServer, stored: MailServer | undefined): MailServer {
	return entered.password || !stored ? entered : { ...entered, password: stored.password };
}

/** The credentials to use for what an admin entered, filling in passwords left empty */
export function credentialsFor(
	input: ImapMailboxInput,
	stored?: MailboxCredentials
): MailboxCredentials {
	return {
		provider: 'imap',
		imap: keepPassword(input.imap, stored?.imap),
		smtp: keepPassword(input.smtp, stored?.smtp)
	};
}

export type SaveResult =
	{ ok: true; mailbox: schema.Mailbox } | { ok: false; status: 404 | 409; message: string };

const addressTaken: SaveResult = {
	ok: false,
	status: 409,
	message: 'The organization already has a mailbox with this address.'
};

/** Adds a mailbox. Its first sync starts reading from the newest message: older mail stays out. */
export async function createMailbox(db: TenantDb, input: ImapMailboxInput): Promise<SaveResult> {
	const [mailbox] = await db
		.insert(schema.mailbox)
		.values({
			name: input.name,
			address: input.address,
			provider: input.provider,
			credentials: sealCredentials(credentialsFor(input)),
			pollIntervalSeconds: input.pollIntervalSeconds,
			enabled: input.enabled
		})
		.onConflictDoNothing({ target: [schema.mailbox.organizationId, schema.mailbox.address] })
		.returning();
	return mailbox ? { ok: true, mailbox } : addressTaken;
}

/**
 * Changes a mailbox. Another server or account means other messages, so the sync then starts over
 * from the newest message, as for a new mailbox.
 */
export async function updateMailbox(
	db: TenantDb,
	id: number,
	input: ImapMailboxInput
): Promise<SaveResult> {
	const existing = await findMailbox(db, id);
	if (!existing) return { ok: false, status: 404, message: 'Mailbox not found.' };

	const stored = openCredentials(existing.credentials);
	const credentials = credentialsFor(input, stored);
	const sameInbox =
		stored.imap.host === credentials.imap.host &&
		stored.imap.port === credentials.imap.port &&
		stored.imap.username === credentials.imap.username;

	try {
		// A savepoint, so a refused address leaves the request's transaction usable
		const mailbox = await db.transaction(async (savepoint) => {
			const [mailbox] = await savepoint
				.update(schema.mailbox)
				.set({
					name: input.name,
					address: input.address,
					credentials: sealCredentials(credentials),
					pollIntervalSeconds: input.pollIntervalSeconds,
					enabled: input.enabled,
					// Errors were about the old settings
					errorCount: 0,
					lastError: null,
					...(sameInbox ? {} : { cursor: null })
				})
				.where(eq(schema.mailbox.id, id))
				.returning();
			return mailbox;
		});
		return { ok: true, mailbox };
	} catch (error) {
		if (isUniqueViolation(error, 'mailbox_organization_id_address_unique')) return addressTaken;
		throw error;
	}
}
