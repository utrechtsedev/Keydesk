import { PgBoss } from 'pg-boss';
import type { NotificationOptions } from '$lib/types';
import { logger } from '../logger';

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

	const { handleSendNotification } = await import('./handlers/notification.handler');

	await boss.work<NotificationOptions>('send-notification', async ([job]) => {
		await handleSendNotification(job.data);
	});

	logger.info('Workers registered');
}

export async function sendNotification(options: NotificationOptions) {
	if (!boss) {
		throw new Error('Queue not initialized');
	}

	await boss.send('send-notification', options);
}
