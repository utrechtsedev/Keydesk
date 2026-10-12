import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { TicketConfig } from '#lib/types/index.js';
import { ticketService } from './ticket.service.js';

afterAll(async () => {
	await db.$client.end();
});

async function readTicketConfig(): Promise<TicketConfig> {
	const [config] = await db.select().from(schema.config).where(eq(schema.config.key, 'tickets'));
	expect(config, 'db:init should have created the ticket configuration').toBeDefined();
	return config.value as TicketConfig;
}

describe('ticketService.getTicketPrefix', () => {
	it('reads the prefix from the default configuration', async () => {
		const config = await readTicketConfig();

		expect(await ticketService.getTicketPrefix()).toBe(config.ticketPrefix);
	});

	it('follows a changed prefix', async () => {
		const original = await readTicketConfig();
		await db
			.update(schema.config)
			.set({ value: { ...original, ticketPrefix: 'HD-' } })
			.where(eq(schema.config.key, 'tickets'));

		try {
			expect(await ticketService.getTicketPrefix()).toBe('HD-');
		} finally {
			await db
				.update(schema.config)
				.set({ value: original })
				.where(eq(schema.config.key, 'tickets'));
		}
	});
});
