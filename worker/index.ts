import { startEmailMonitoring } from "./monitor";
import { registerAllHandlers } from "../src/lib/server/job-queue/handlers"
import { startJobWorker } from "../src/lib/server/job-queue";

async function main() {
  startEmailMonitoring();
  registerAllHandlers();
  await startJobWorker(); // Now async
}

main().catch(console.error);
