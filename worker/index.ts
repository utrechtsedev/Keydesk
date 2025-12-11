import { startEmailMonitoring } from "./monitor";
import { registerAllHandlers } from "../src/lib/server/job-queue/handlers"
import { startJobWorker } from "../src/lib/server/job-queue";
import { logger } from "../src/lib/server/logger";

async function main() {
  startEmailMonitoring();
  registerAllHandlers();
  await startJobWorker(); // Now async
}

async function runForever() {
  while (true) {
    try {
      await main();
    } catch (error) {
      logger.error({ error }, 'Main process crashed, restarting in 5 seconds');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

runForever();
