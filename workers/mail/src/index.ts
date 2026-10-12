import { env } from 'cloudflare:workers';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { connect, disconnect } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { runJob, type Job } from '#lib/server/jobs.js';
import { logger } from '#lib/server/logger.js';
import { mailboxSync } from './mailbox-sync.js';

export { MailboxSync } from './mailbox-sync.js';

/** A mailbox counts as stalled when its sync is this late; the cron then schedules it again */
const STALLED_AFTER_MS = 5 * 60 * 1000;

/**
 * The mail Worker: runs the jobs the app queues (notifications, replies) and syncs the mailboxes,
 * each through its own Durable Object. A failed job is retried a few times and then moved to the
 * keydesk-jobs-failed queue.
 */
export default {
	async queue(batch) {
		const systemDb = connect(env.HYPERDRIVE.connectionString);
		try {
			for (const message of batch.messages) {
				const job = message.body;
				try {
					if (job.type === 'mailbox-sync') {
						await mailboxSync(env, job.mailboxId).schedule({
							organizationId: job.organizationId,
							mailboxId: job.mailboxId
						});
					} else {
						await runJob(systemDb, job);
					}
					message.ack();
				} catch (error) {
					logger.error(
						{ error, job: job.type, attempts: message.attempts },
						'Job failed, retrying'
					);
					message.retry();
				}
			}
		} finally {
			await disconnect(systemDb);
		}
	},

	/**
	 * A safety net: schedules every enabled mailbox whose sync is overdue, for instance when a job
	 * to schedule it got lost or its alarm gave up after repeated failures
	 */
	async scheduled() {
		const systemDb = connect(env.HYPERDRIVE.connectionString);
		try {
			// Across organizations, as the owner: only ids and organizations, to schedule them
			const stalled = await systemDb
				.select({ id: schema.mailbox.id, organizationId: schema.mailbox.organizationId })
				.from(schema.mailbox)
				.where(
					and(
						eq(schema.mailbox.enabled, true),
						or(
							isNull(schema.mailbox.nextSyncAt),
							lt(schema.mailbox.nextSyncAt, new Date(Date.now() - STALLED_AFTER_MS))
						)
					)
				);
			for (const mailbox of stalled) {
				await mailboxSync(env, mailbox.id).schedule({
					organizationId: mailbox.organizationId,
					mailboxId: mailbox.id
				});
			}
			if (stalled.length > 0) {
				logger.info({ mailboxes: stalled.length }, 'Scheduled overdue mailbox syncs');
			}
		} finally {
			await disconnect(systemDb);
		}
	}
} satisfies ExportedHandler<Env, Job>;
