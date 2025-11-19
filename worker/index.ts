import { startEmailMonitoring } from "./monitor";
import { registerAllHandlers } from "../src/lib/server/job-queue/handlers"
import { startJobWorker } from "../src/lib/server/job-queue";

startEmailMonitoring()
registerAllHandlers();

// Start worker
startJobWorker();
