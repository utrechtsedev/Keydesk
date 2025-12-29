import { PgBoss } from 'pg-boss';
import { logger } from '$lib/server/logger';
import type { NotificationOptions, Task, Ticket, User } from '$lib/types';

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
	await boss.createQueue('handle-ticket-update');
	await boss.createQueue('handle-task-update');
	await boss.createQueue('handle-standalone-notification');

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

	await boss.work<NotificationOptions>('handle-standalone-notification', async ([job]) => {
		await notificationService.sendNotification(job.data);
	});

	logger.info('Workers registered');
}

export async function ticketNotification(oldTicket: Ticket, newTicket: Ticket, user: User) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}
	await boss.send('handle-ticket-update', { oldTicket, newTicket, user });
}

export async function taskNotification(oldTask: Task, newTask: Task, user: User) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}
	await boss.send('handle-task-update', { oldTask, newTask, user });
}

export async function sendNotification(options: NotificationOptions) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}
	await boss.send('handle-task-update', { options });
}
