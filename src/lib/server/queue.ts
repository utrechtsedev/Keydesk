import { env } from 'cloudflare:workers';
import type { NotificationOptions } from '#lib/types/index.js';
import type { Job } from '#lib/server/jobs.js';
import { logger } from '#lib/server/logger.js';

/**
 * Queues a notification for the mail Worker. It goes out once the request's transaction has
 * committed (see `sendQueuedJobs`), so a request that fails sends nothing.
 */
export function sendNotification(
	locals: App.Locals,
	organizationId: number,
	options: NotificationOptions
): void {
	locals.jobs.push({ type: 'notification', organizationId, options });
}

/**
 * Sends the jobs a request queued, after its transaction has committed. The request's changes are
 * saved by then, so a failure here is logged rather than failing the request.
 */
export async function sendQueuedJobs(jobs: Job[]): Promise<void> {
	if (jobs.length === 0) return;
	try {
		await env.JOBS.sendBatch(jobs.map((job) => ({ body: job })));
	} catch (error) {
		logger.error({ error, jobs: jobs.length }, 'Could not queue jobs');
	}
}
