import { env } from 'cloudflare:workers';
import { connect, disconnect } from '#lib/server/db/database.js';
import { runJob, type Job } from '#lib/server/jobs.js';
import { logger } from '#lib/server/logger.js';

/**
 * The mail Worker: runs the jobs the app queues, such as notifications. Mailbox syncs join it
 * later. A failed job is retried a few times and then moved to the keydesk-jobs-failed queue.
 */
export default {
	async queue(batch) {
		const systemDb = connect(env.HYPERDRIVE.connectionString);
		try {
			for (const message of batch.messages) {
				try {
					await runJob(systemDb, message.body);
					message.ack();
				} catch (error) {
					logger.error(
						{ error, job: message.body.type, attempts: message.attempts },
						'Job failed, retrying'
					);
					message.retry();
				}
			}
		} finally {
			await disconnect(systemDb);
		}
	}
} satisfies ExportedHandler<Env, Job>;
