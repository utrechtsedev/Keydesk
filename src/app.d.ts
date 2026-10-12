import type { Session } from 'better-auth';
import type { User } from '#lib/types/index.js';
import type { SystemDb, TenantDb } from '#lib/server/db/database.js';
import type { Auth } from '#lib/server/auth.js';
import type { Job } from '#lib/server/jobs.js';

declare global {
	namespace Cloudflare {
		/**
		 * The app Worker's bindings, as wrangler.jsonc declares them. They are written out here rather
		 * than generated: Wrangler's generated version imports the built Worker once it exists, which
		 * would type-check the build output.
		 */
		interface Env {
			HYPERDRIVE: Hyperdrive;
			ATTACHMENTS: R2Bucket;
			JOBS: Queue<Job>;
			ASSETS: Fetcher;
		}
	}

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
			/** Jobs for the mail Worker, sent once the request's transaction has committed */
			jobs: Job[];
		}
	}
}

export {};
