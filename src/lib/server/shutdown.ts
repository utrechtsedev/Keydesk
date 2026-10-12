import { db } from '#lib/server/db/database.js';
import { stopQueue } from '#lib/server/queue.js';

/** Releases what the server keeps open (the queue workers and the database pool), so its process can exit */
export async function shutdown() {
	await stopQueue();
	await db.$client.end();
}
