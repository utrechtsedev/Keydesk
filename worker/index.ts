import 'dotenv/config';
import { logger } from '#lib/server/logger.js';
import { databaseUrl } from '#lib/server/db/database.js';
import { workerOrganizationId } from './tenant';

async function main() {
	databaseUrl();
	workerOrganizationId();
	// monitor.ts reads the IMAP settings from the database while loading, so it loads after the check.
	// Notifications are the app's queue work; this worker only reads the inbox.
	const { startEmailMonitoring } = await import('./monitor');
	await startEmailMonitoring();
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
