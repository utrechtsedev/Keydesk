import { asc, eq } from 'drizzle-orm';
import type { TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { ImapMailboxInput, MailboxSettings, MailServer } from '#lib/server/db/schema/index.js';
import { isUniqueViolation } from '#lib/server/services/user.service.js';
import {
	openCredentials,
	sealCredentials,
	type ImapCredentials,
	type MicrosoftCredentials
} from './credentials.js';

/** A mail server as the settings screen shows it: without its password */
export type MailServerView = Omit<MailServer, 'password'> & { hasPassword: boolean };

interface MailboxViewBase {
	id: number;
	name: string;
	address: string;
	pollIntervalSeconds: number;
	enabled: boolean;
	lastSyncedAt: Date | null;
	nextSyncAt: Date | null;
	errorCount: number;
	lastError: string | null;
}

/** A mailbox as the settings screen shows it; credentials never leave the server */
export type MailboxView =
	| (MailboxViewBase & { provider: 'imap'; imap: MailServerView; smtp: MailServerView })
	| (MailboxViewBase & { provider: 'microsoft' });

function serverView({ password, ...server }: MailServer): MailServerView {
	return { ...server, hasPassword: password.length > 0 };
}

export function mailboxView(mailbox: schema.Mailbox): MailboxView {
	const base: MailboxViewBase = {
		id: mailbox.id,
		name: mailbox.name,
		address: mailbox.address,
		pollIntervalSeconds: mailbox.pollIntervalSeconds,
		enabled: mailbox.enabled,
		lastSyncedAt: mailbox.lastSyncedAt,
		nextSyncAt: mailbox.nextSyncAt,
		errorCount: mailbox.errorCount,
		lastError: mailbox.lastError
	};
	const credentials = openCredentials(mailbox.credentials);
	return credentials.provider === 'imap'
		? {
				...base,
				provider: 'imap',
				imap: serverView(credentials.imap),
				smtp: serverView(credentials.smtp)
			}
		: { ...base, provider: credentials.provider };
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
export function credentialsFor(input: ImapMailboxInput, stored?: ImapCredentials): ImapCredentials {
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
const notFound: SaveResult = { ok: false, status: 404, message: 'Mailbox not found.' };

/** Adds a mailbox. Its first sync starts reading from the newest message: older mail stays out. */
async function insertMailbox(
	db: TenantDb,
	values: { name: string; address: string; pollIntervalSeconds: number; enabled: boolean },
	credentials: ImapCredentials | MicrosoftCredentials
): Promise<SaveResult> {
	const [mailbox] = await db
		.insert(schema.mailbox)
		.values({
			...values,
			provider: credentials.provider,
			credentials: sealCredentials(credentials)
		})
		.onConflictDoNothing({ target: [schema.mailbox.organizationId, schema.mailbox.address] })
		.returning();
	return mailbox ? { ok: true, mailbox } : addressTaken;
}

/** Changes a mailbox in a savepoint, so a refused address leaves the request's transaction usable */
async function saveMailbox(
	db: TenantDb,
	id: number,
	values: Partial<schema.NewMailbox>
): Promise<SaveResult> {
	try {
		const mailbox = await db.transaction(async (savepoint) => {
			const [mailbox] = await savepoint
				.update(schema.mailbox)
				.set(values)
				.where(eq(schema.mailbox.id, id))
				.returning();
			return mailbox;
		});
		return mailbox ? { ok: true, mailbox } : notFound;
	} catch (error) {
		if (isUniqueViolation(error, 'mailbox_organization_id_address_unique')) return addressTaken;
		throw error;
	}
}

export function createImapMailbox(db: TenantDb, input: ImapMailboxInput): Promise<SaveResult> {
	const { name, address, pollIntervalSeconds, enabled } = input;
	return insertMailbox(db, { name, address, pollIntervalSeconds, enabled }, credentialsFor(input));
}

/**
 * Changes an IMAP mailbox. Another server or account means other messages, so the sync then
 * starts over from the newest message, as for a new mailbox.
 */
export async function updateImapMailbox(
	db: TenantDb,
	id: number,
	input: ImapMailboxInput
): Promise<SaveResult> {
	const existing = await findMailbox(db, id);
	if (!existing) return notFound;
	const stored = openCredentials(existing.credentials);
	if (stored.provider !== 'imap') {
		return { ok: false, status: 409, message: 'This mailbox is connected through its provider.' };
	}

	const credentials = credentialsFor(input, stored);
	const sameInbox =
		stored.imap.host === credentials.imap.host &&
		stored.imap.port === credentials.imap.port &&
		stored.imap.username === credentials.imap.username;

	return saveMailbox(db, id, {
		name: input.name,
		address: input.address,
		credentials: sealCredentials(credentials),
		pollIntervalSeconds: input.pollIntervalSeconds,
		enabled: input.enabled,
		// Errors were about the old settings
		errorCount: 0,
		lastError: null,
		...(sameInbox ? {} : { cursor: null })
	});
}

/** Changes what every mailbox has, whatever its provider: its name, poll interval and switch */
export function updateMailboxSettings(
	db: TenantDb,
	id: number,
	settings: MailboxSettings
): Promise<SaveResult> {
	return saveMailbox(db, id, settings);
}

/**
 * Saves a mailbox an admin connected at Microsoft: a new one, or for `mailboxId` an existing one
 * connected again, for instance after its permissions were withdrawn. Connected to another tenant,
 * the sync starts over from the newest message.
 */
export async function saveMicrosoftMailbox(
	db: TenantDb,
	mailbox: { mailboxId?: number; name: string; address: string; pollIntervalSeconds: number },
	credentials: MicrosoftCredentials
): Promise<SaveResult> {
	const { mailboxId, ...values } = mailbox;
	if (mailboxId === undefined) {
		return insertMailbox(db, { ...values, enabled: true }, credentials);
	}

	const existing = await findMailbox(db, mailboxId);
	if (!existing) return notFound;
	const stored = openCredentials(existing.credentials);
	const sameTenant = stored.provider === 'microsoft' && stored.tenantId === credentials.tenantId;
	return saveMailbox(db, mailboxId, {
		provider: 'microsoft',
		credentials: sealCredentials(credentials),
		errorCount: 0,
		lastError: null,
		...(sameTenant ? {} : { cursor: null })
	});
}
