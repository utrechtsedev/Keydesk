import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';

/**
 * A connection as the tables' owner, which row level security doesn't limit. Only better-auth,
 * signing in, invitations, the command line tools and `withTenant` use it; work on an
 * organization's data gets a tenant transaction instead.
 */
export type SystemDb = NodePgDatabase<typeof schema> & { $client: pg.Pool };

/** A transaction limited to one organization's rows; see `withTenant` */
export type TenantDb = Parameters<Parameters<SystemDb['transaction']>[0]>[0];

/**
 * Opens the database for one unit of work: a request, a job or a command line run. Close it with
 * `disconnect` when that work is done. Cloudflare Workers can't use a connection in another
 * request than the one that opened it, so nothing keeps connections open between units of work;
 * there, Hyperdrive keeps the actual connections to Postgres.
 *
 * The pool connects on its first query.
 */
export function connect(connectionString: string): SystemDb {
	const pool = new pg.Pool({ connectionString, max: 5 });
	return drizzle({ client: pool, schema });
}

export function disconnect(systemDb: SystemDb): Promise<void> {
	return systemDb.$client.end();
}

/**
 * Runs `work` in a transaction that only sees and writes the given organization's rows. It
 * switches to the keydesk_app role, which the row level security policies apply to, and sets the
 * organization those policies compare against; new rows get that organization by default.
 */
export function withTenant<T>(
	systemDb: SystemDb,
	organizationId: number,
	work: (db: TenantDb) => Promise<T>
): Promise<T> {
	if (!Number.isInteger(organizationId)) {
		throw new Error(`Invalid organization id: ${organizationId}`);
	}

	return systemDb.transaction(async (tx) => {
		await tx.execute(
			sql`select set_config('app.organization_id', ${String(organizationId)}, true)`
		);
		await tx.execute(sql`set local role keydesk_app`);
		return work(tx);
	});
}

/** The database URL for the command line tools and the Node processes, from DATABASE_URL */
export function databaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error('Database URL not found in environment variables.');
	}
	return url;
}
