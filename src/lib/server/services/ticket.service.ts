import type { TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { ValidationError } from '#lib/server/errors.js';
import type { TicketConfig } from '#lib/types/index.js';
import { eq, ilike, max, or, sql, type SQL } from 'drizzle-orm';

/** What config 'tickets' stores; the next ticket number lives on the organization */
type StoredTicketConfig = Omit<TicketConfig, 'nextTicketNumber'>;

/** The prefix shown before ticket numbers, such as TKT- in TKT-12 */
export async function getTicketPrefix(db: TenantDb): Promise<string> {
	const [ticketConfig] = await db
		.select()
		.from(schema.config)
		.where(eq(schema.config.key, 'tickets'));

	if (!ticketConfig) return 'TKT-';

	const configValue = ticketConfig.value as StoredTicketConfig;
	return configValue.ticketPrefix;
}

/** The ticket settings as Settings > Tickets shows them, or null before they are saved */
export async function getTicketSettings(
	db: TenantDb,
	organizationId: number
): Promise<TicketConfig | null> {
	const [ticketConfig] = await db
		.select()
		.from(schema.config)
		.where(eq(schema.config.key, 'tickets'));
	if (!ticketConfig) return null;

	const [organization] = await db
		.select({ nextTicketNumber: schema.organization.nextTicketNumber })
		.from(schema.organization)
		.where(eq(schema.organization.id, organizationId));

	return { ...(ticketConfig.value as StoredTicketConfig), ...organization };
}

/**
 * Saves the ticket settings. The next ticket number must stay above the highest number in use,
 * or a new ticket would collide with an existing one.
 */
export async function saveTicketSettings(
	db: TenantDb,
	organizationId: number,
	{ nextTicketNumber, ...stored }: TicketConfig
): Promise<TicketConfig> {
	const [highest] = await db.select({ ticketNumber: max(schema.ticket.ticketNumber) }).from(schema.ticket);
	const highestNumber = highest?.ticketNumber ?? 0;
	if (nextTicketNumber <= highestNumber) {
		throw new ValidationError(
			`The next ticket number must be higher than ${highestNumber}, the highest number in use`
		);
	}

	await db
		.insert(schema.config)
		.values({ key: 'tickets', value: stored })
		.onConflictDoUpdate({
			target: [schema.config.organizationId, schema.config.key],
			set: { value: stored, updatedAt: new Date() }
		});
	await db
		.update(schema.organization)
		.set({ nextTicketNumber })
		.where(eq(schema.organization.id, organizationId));

	return { ...stored, nextTicketNumber };
}

/**
 * Hands out the organization's next ticket number. The update locks the organization's row until
 * the transaction ends, so two new tickets never get the same number.
 */
export async function allocateTicketNumber(db: TenantDb, organizationId: number): Promise<number> {
	const [allocated] = await db
		.update(schema.organization)
		.set({ nextTicketNumber: sql`${schema.organization.nextTicketNumber} + 1` })
		.where(eq(schema.organization.id, organizationId))
		.returning({ ticketNumber: sql<number>`${schema.organization.nextTicketNumber} - 1` });

	if (!allocated) {
		throw new Error(`Organization ${organizationId} not found`);
	}
	return allocated.ticketNumber;
}

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
