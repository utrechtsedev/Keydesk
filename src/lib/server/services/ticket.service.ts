import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import type { TicketConfig } from '$lib/types';
import { eq } from 'drizzle-orm';

class TicketService {
	/**
	 * Fetch Ticket prefix
	 */
	public async getTicketPrefix(): Promise<string> {
		const [ticketConfig] = await db
			.select()
			.from(schema.config)
			.where(eq(schema.config.key, 'tickets'));

		if (!ticketConfig) return 'TKT-';

		const configValue = ticketConfig.value as TicketConfig;
		return configValue.ticketPrefix;
	}
}

export const ticketService = new TicketService();
