import { PgBoss } from 'pg-boss';
import { logger } from '#lib/server/logger.js';
import type { NotificationOptions, Task, Ticket, User } from '#lib/types/index.js';
import {
	connect,
	databaseUrl,
	disconnect,
	withTenant,
	type TenantDb
} from '#lib/server/db/database.js';

/** Every job belongs to an organization; its handler runs in that organization's tenant transaction */
interface OrganizationJob {
	organizationId: number;
}

let boss: PgBoss | null = null;

export async function initQueue() {
	if (boss) return boss;

	boss = new PgBoss({
		connectionString: databaseUrl(),
		schema: 'pgboss'
	});

	boss.on('error', (error) => {
		logger.error({ error }, 'pg-boss error');
	});

	await boss.start();
	await boss.createQueue('handle-ticket-update');
	await boss.createQueue('handle-task-update');
	await boss.createQueue('handle-standalone-notification');

	logger.info('pg-boss initialized');
	return boss;
}

/** Stops the workers, letting running jobs finish, and closes the queue's connections */
export async function stopQueue() {
	if (!boss) return;
	await boss.stop({ graceful: true });
	boss = null;
}

export async function registerWorkers() {
	if (!boss) {
		throw new Error('Queue not initialized');
	}

	const { NotificationService } = await import('#lib/server/services/notification.service.js');

	/** Runs a job in its organization's tenant transaction, on a connection of its own */
	async function inOrganization(organizationId: number, work: (db: TenantDb) => Promise<void>) {
		const systemDb = connect(databaseUrl());
		try {
			await withTenant(systemDb, organizationId, work);
		} finally {
			await disconnect(systemDb);
		}
	}

	await boss.work<OrganizationJob & { oldTask: Task; newTask: Task; user: User }>(
		'handle-task-update',
		async ([job]) => {
			const { organizationId, oldTask, newTask, user } = job.data;
			await inOrganization(organizationId, (db) =>
				new NotificationService(db, organizationId).handleTaskUpdate(oldTask, newTask, user)
			);
		}
	);

	await boss.work<OrganizationJob & { oldTicket: Ticket; newTicket: Ticket; user: User }>(
		'handle-ticket-update',
		async ([job]) => {
			const { organizationId, oldTicket, newTicket, user } = job.data;
			await inOrganization(organizationId, (db) =>
				new NotificationService(db, organizationId).handleTicketUpdate(oldTicket, newTicket, user)
			);
		}
	);

	await boss.work<OrganizationJob & { options: NotificationOptions }>(
		'handle-standalone-notification',
		async ([job]) => {
			const { organizationId, options } = job.data;
			await inOrganization(organizationId, (db) =>
				new NotificationService(db, organizationId).sendNotification(options)
			);
		}
	);

	logger.info('Workers registered');
}

export async function ticketNotification(oldTicket: Ticket, newTicket: Ticket, user: User) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}
	await boss.send('handle-ticket-update', {
		organizationId: user.organizationId,
		oldTicket,
		newTicket,
		user
	});
}

export async function taskNotification(oldTask: Task, newTask: Task, user: User) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}
	await boss.send('handle-task-update', {
		organizationId: user.organizationId,
		oldTask,
		newTask,
		user
	});
}

export async function sendNotification(organizationId: number, options: NotificationOptions) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}
	await boss.send('handle-standalone-notification', { organizationId, options });
}
