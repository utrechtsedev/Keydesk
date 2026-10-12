import { eq } from 'drizzle-orm';
import { withTenant, type SystemDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { logger } from '#lib/server/logger.js';
import { NotificationService } from '#lib/server/services/notification.service.js';
import { openCredentials } from './credentials.js';
import { readImapInbox, type ImapCursor } from './imap.js';
import { describeOutcome, processIncomingEmail } from './incoming.js';

/** Messages per sync; with more waiting, the next sync follows right away */
const BATCH_SIZE = 20;
/** The longest wait after repeated failures */
const MAX_BACKOFF_MS = 60 * 60 * 1000;
/** After this many failures in a row, the organization's admins hear about it */
const NOTIFY_AFTER_FAILURES = 3;

/**
 * Reads a mailbox's new email into tickets and returns when it should be read next, or null when
 * the mailbox is gone or switched off. Each message is saved together with the cursor past it, so
 * a sync that stops halfway resumes after the last saved message. A failure to reach the mail
 * server is recorded on the mailbox and retried later, waiting longer each time.
 */
export async function syncMailbox(
	systemDb: SystemDb,
	organizationId: number,
	mailboxId: number
): Promise<Date | null> {
	const mailbox = await withTenant(systemDb, organizationId, async (db) => {
		const [mailbox] = await db
			.select()
			.from(schema.mailbox)
			.where(eq(schema.mailbox.id, mailboxId));
		return mailbox;
	});
	if (!mailbox || !mailbox.enabled) return null;

	const credentials = openCredentials(mailbox.credentials);
	let read: { cursor: ImapCursor; more: boolean };
	try {
		read = await readImapInbox(
			credentials.imap,
			mailbox.cursor as ImapCursor | null,
			mailbox.lastSyncedAt,
			BATCH_SIZE,
			(message) =>
				withTenant(systemDb, organizationId, async (db) => {
					const outcome = await processIncomingEmail(db, organizationId, mailbox, message);
					await db
						.update(schema.mailbox)
						.set({ cursor: message.cursor })
						.where(eq(schema.mailbox.id, mailbox.id));
					logger.info(
						{ organizationId, mailboxId, message: message.providerMessageId },
						describeOutcome(outcome)
					);
				})
		);
	} catch (error) {
		return recordFailure(systemDb, organizationId, mailbox, error);
	}

	const nextSyncAt = new Date(Date.now() + (read.more ? 1000 : mailbox.pollIntervalSeconds * 1000));
	await withTenant(systemDb, organizationId, (db) =>
		db
			.update(schema.mailbox)
			.set({
				cursor: read.cursor,
				lastSyncedAt: new Date(),
				nextSyncAt,
				errorCount: 0,
				lastError: null
			})
			.where(eq(schema.mailbox.id, mailbox.id))
	);
	return nextSyncAt;
}

async function recordFailure(
	systemDb: SystemDb,
	organizationId: number,
	mailbox: schema.Mailbox,
	error: unknown
): Promise<Date> {
	const message = error instanceof Error ? error.message : String(error);
	const errorCount = mailbox.errorCount + 1;
	const backoff = Math.min(
		mailbox.pollIntervalSeconds * 1000 * 2 ** (errorCount - 1),
		MAX_BACKOFF_MS
	);
	const nextSyncAt = new Date(Date.now() + backoff);
	logger.warn(
		{ organizationId, mailboxId: mailbox.id, errorCount, error: message },
		'Mailbox sync failed'
	);

	await withTenant(systemDb, organizationId, async (db) => {
		await db
			.update(schema.mailbox)
			.set({ errorCount, lastError: message, nextSyncAt })
			.where(eq(schema.mailbox.id, mailbox.id));

		if (errorCount === NOTIFY_AFTER_FAILURES) {
			const admins = await db
				.select({ id: schema.user.id })
				.from(schema.user)
				.where(eq(schema.user.role, 'admin'));
			await new NotificationService(db, organizationId).sendNotification({
				title: `Mailbox ${mailbox.address} can't be read`,
				message: `Keydesk couldn't read ${mailbox.address} ${errorCount} times in a row: ${message}. Check its settings under Settings > Mailboxes.`,
				recipient: { userIds: admins.map((admin) => admin.id) },
				channels: ['dashboard'],
				notification: { type: 'error', event: 'system' }
			});
		}
	});
	return nextSyncAt;
}
