import type { NotificationOptions } from '#lib/types/index.js';
import { withTenant, type SystemDb } from '#lib/server/db/database.js';
import { NotificationService } from '#lib/server/services/notification.service.js';
import { sendReply } from '#lib/server/mail/outgoing.js';

/** Jobs that work on the organization's data; `runJob` runs them */
export type DatabaseJob =
	| { type: 'notification'; organizationId: number; options: NotificationOptions }
	/** Emails an agent's reply to the requester */
	| { type: 'send-reply'; organizationId: number; ticketMessageId: number };

/** Syncs a mailbox now and keeps syncing it; the mailbox's Durable Object handles it */
export type MailboxSyncJob = { type: 'mailbox-sync'; organizationId: number; mailboxId: number };

/**
 * Work the app leaves to the mail Worker, through the jobs queue: anything that may be slow or
 * can fail on its own, such as sending email. Each job belongs to an organization.
 */
export type Job = DatabaseJob | MailboxSyncJob;

/** Runs a job in its organization's tenant transaction; the mail Worker calls this per message */
export async function runJob(systemDb: SystemDb, job: DatabaseJob): Promise<void> {
	switch (job.type) {
		case 'notification':
			await withTenant(systemDb, job.organizationId, (db) =>
				new NotificationService(db, job.organizationId).sendNotification(job.options)
			);
			return;
		case 'send-reply':
			await withTenant(systemDb, job.organizationId, (db) => sendReply(db, job.ticketMessageId));
			return;
	}
}
