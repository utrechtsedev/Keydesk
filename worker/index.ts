import { logger } from '#lib/server/logger.js';
import { initQueue, registerWorkers } from '#lib/server/queue.js';
import { assertDatabaseUrl } from '#lib/server/db/database.js';
import { workerOrganizationId } from './tenant';

async function main() {
	assertDatabaseUrl();
	workerOrganizationId();
	// monitor.ts reads the IMAP settings from the database while loading, so it loads after the check
	const { startEmailMonitoring } = await import('./monitor');
	await Promise.all([startEmailMonitoring(), initQueue(), registerWorkers()]);
}

async function run() {
	while (true) {
		try {
			await main();
		} catch (error) {
			logger.error({ error }, 'Main process crashed, restarting in 5 seconds');
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}
}

run();
