import { PgBoss } from 'pg-boss';
import { logger } from '$lib/server/logger';
import type { Task, Ticket, User } from '$lib/types';

let boss: PgBoss | null = null;

export async function initQueue() {
	if (boss) return boss;

	boss = new PgBoss({
		connectionString: process.env.DATABASE_URL,
		schema: 'pgboss'
	});

	boss.on('error', (error) => {
		logger.error({ error }, 'pg-boss error');
	});

	await boss.start();
	await boss.createQueue('send-notification');

	logger.info('pg-boss initialized');
	return boss;
}

export async function registerWorkers() {
	if (!boss) {
		throw new Error('Queue not initialized');
	}

	const { notificationService } = await import('$lib/server/services/notification.service');

	await boss.work<{ oldTask: Task; newTask: Task; user: User }>(
		'handle-task-update',
		async ([job]) => {
			await notificationService.handleTaskUpdate(job.data.oldTask, job.data.newTask, job.data.user);
		}
	);

	await boss.work<{ oldTicket: Ticket; newTicket: Ticket; user: User }>(
		'handle-ticket-update',
		async ([job]) => {
			await notificationService.handleTicketUpdate(
				job.data.oldTicket,
				job.data.newTicket,
				job.data.user
			);
		}
	);

	logger.info('Workers registered');
}

export async function sendNotification(options: NotificationOptions) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}

	await boss.send('send-notification', options);
}
