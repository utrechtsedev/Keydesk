import type { Session } from 'better-auth';
import type { User } from '#lib/types/index.js';
import type { TenantDb } from '#lib/server/db/database.js';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
			/** The request's tenant transaction, set for signed-in users; see requireAuth */
			db: TenantDb | null;
		}
	}
}

export {};
