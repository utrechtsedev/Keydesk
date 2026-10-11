import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '#lib/server/db/schema/index.js';
import 'dotenv/config';

// The pool connects on the first query, so importing this module (as the build does) needs no database.
export const db = drizzle({ connection: { connectionString: process.env.DATABASE_URL }, schema });

/**
 * Entrypoints call this at startup instead of at import, so a missing DATABASE_URL still fails
 * loudly without the build depending on a database.
 */
export function assertDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database URL not found in environment variables.');
  }
}
