import type { Session } from 'better-auth';
import type { User } from '#lib/types/index.js';
import type { SystemDb, TenantDb } from '#lib/server/db/database.js';
import type { Auth } from '#lib/server/auth.js';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
			/** The request's tenant transaction, set for signed-in users; see requireAuth */
			db: TenantDb | null;
			/**
			 * The request's owner connection, for the few things that happen before there is an
			 * organization (accepting an invitation) or outside its tables (sessions). Everything
			 * else uses `db`.
			 */
			systemDb: SystemDb;
			/** better-auth on the request's connection */
			auth: Auth;
		}
	}
}

export {};
