import { startEmailMonitoring } from './monitor';
import { logger } from '$lib/server/logger';
import { initQueue, registerWorkers } from '$lib/server/queue';

async function main() {
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
