import { startEmailMonitoring } from "./monitor";
import { registerAllHandlers } from "$lib/server/job-queue/handlers"
import { startJobWorker } from "$lib/server/job-queue";
import { logger } from "$lib/server/logger";

async function main() {
  startEmailMonitoring();

  registerAllHandlers();
  await startJobWorker();
}

async function run() {
  while (true) {
    try {
      await main();
    } catch (error) {
      logger.error({ error }, 'Main process crashed, restarting in 5 seconds');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

run();
