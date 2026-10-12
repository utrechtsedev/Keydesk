import { eq } from 'drizzle-orm';
import { systemDb, type TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { NotificationPreferences } from '#lib/types/index.js';

/** New users get every notification, on the dashboard and by email */
export const defaultNotificationPreferences = {
	dashboard: { ticketCreated: true, itemAssigned: true, itemUpdated: true, itemClosed: true },
	email: { ticketCreated: true, itemAssigned: true, itemUpdated: true, itemClosed: true }
} satisfies NotificationPreferences;

/**
 * Signs a user of the tenant's organization out everywhere. Sessions are better-auth's and outside
 * the tenant role's reach, so they are deleted as the owner, after the tenant transaction has
 * shown that the user belongs to its organization.
 */
export async function revokeSessions(db: TenantDb, userId: number): Promise<void> {
	const [user] = await db
		.select({ id: schema.user.id })
		.from(schema.user)
		.where(eq(schema.user.id, userId));
	if (!user) {
		throw new Error(`User ${userId} is not in this organization`);
	}

	await systemDb.delete(schema.session).where(eq(schema.session.userId, user.id));
}

/** Whether `error` is Postgres refusing a duplicate value in the given unique constraint */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
	// Drizzle wraps the driver's error
	const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
	return (
		typeof cause === 'object' &&
		cause !== null &&
		'code' in cause &&
		cause.code === '23505' &&
		'constraint' in cause &&
		cause.constraint === constraint
	);
}
