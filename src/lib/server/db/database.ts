import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';
import 'dotenv/config';

/**
 * Connects as the tables' owner, which row level security doesn't limit. Only better-auth, the
 * command line tools and `withTenant` use it; work on an organization's data gets a tenant
 * transaction instead.
 *
 * The pool connects on the first query, so importing this module (as the build does) needs no
 * database.
 */
export const systemDb = drizzle({
  connection: { connectionString: process.env.DATABASE_URL },
  schema
});

/** A transaction limited to one organization's rows; see `withTenant` */
export type TenantDb = Parameters<Parameters<typeof systemDb.transaction>[0]>[0];

/**
 * Runs `work` in a transaction that only sees and writes the given organization's rows. It
 * switches to the keydesk_app role, which the row level security policies apply to, and sets the
 * organization those policies compare against; new rows get that organization by default.
 */
export function withTenant<T>(
  organizationId: number,
  work: (db: TenantDb) => Promise<T>
): Promise<T> {
  if (!Number.isInteger(organizationId)) {
    throw new Error(`Invalid organization id: ${organizationId}`);
  }

  return systemDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.organization_id', ${String(organizationId)}, true)`);
    await tx.execute(sql`set local role keydesk_app`);
    return work(tx);
  });
}

/**
 * Entrypoints call this at startup instead of at import, so a missing DATABASE_URL still fails
 * loudly without the build depending on a database.
 */
export function assertDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database URL not found in environment variables.');
  }
}
