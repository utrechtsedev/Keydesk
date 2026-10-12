import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { TicketConfig } from '#lib/types/index.js';
import { eq, ilike, or, sql, type SQL } from 'drizzle-orm';

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

/**
 * Matches tickets whose number or subject contains the search text. The ticket number is an
 * integer column, so it is compared as text.
 */
export function ticketSearchCondition(search: string): SQL | undefined {
	const pattern = `%${search}%`;
	return or(
		ilike(sql`${schema.ticket.ticketNumber}::text`, pattern),
		ilike(schema.ticket.subject, pattern)
	);
}
