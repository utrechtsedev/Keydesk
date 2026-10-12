import type { NotificationOptions } from '#lib/types/index.js';
import { withTenant, type SystemDb } from '#lib/server/db/database.js';
import { NotificationService } from '#lib/server/services/notification.service.js';

/**
 * Work the app leaves to the mail Worker, through the jobs queue: anything that may be slow or
 * can fail on its own, such as sending email. Each job belongs to an organization.
 */
export type Job = { type: 'notification'; organizationId: number; options: NotificationOptions };

/** Runs a job in its organization's tenant transaction; the mail Worker calls this per message */
export async function runJob(systemDb: SystemDb, job: Job): Promise<void> {
	switch (job.type) {
		case 'notification':
			await withTenant(systemDb, job.organizationId, (db) =>
				new NotificationService(db, job.organizationId).sendNotification(job.options)
			);
			return;
	}
}
