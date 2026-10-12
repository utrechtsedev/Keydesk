import { stopQueue } from '#lib/server/queue.js';

/** Releases what the server keeps open (the queue workers), so its process can exit */
export async function shutdown() {
	await stopQueue();
}
