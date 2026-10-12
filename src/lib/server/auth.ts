import { betterAuth, type Session, type User as BetterAuthUser } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { admin, magicLink } from 'better-auth/plugins';
import { inArray } from 'drizzle-orm';
import { sendEmailToUser } from './email/email';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { systemDb, type TenantDb } from './db/database';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from './db/schema/index.js';
import { redirect } from '@sveltejs/kit';
import type { User } from '#lib/types/index.js';
import { defaultNotificationPreferences } from './services/user.service.js';

/**
 * The admin plugin's endpoints act on users of every organization. Keydesk manages users through
 * its own endpoints, in the admin's tenant transaction, and uses the plugin only to impersonate a
 * user of the admin's own organization (and to stop again).
 */
const limitAdminEndpoints = createAuthMiddleware(async (ctx) => {
	if (!ctx.path.startsWith('/admin/') || ctx.path === '/admin/stop-impersonating') return;
	if (ctx.path !== '/admin/impersonate-user') {
		throw new APIError('FORBIDDEN', { message: 'Users are managed under Settings > Users.' });
	}

	// The body isn't validated yet: only an id that the endpoint will read the same way passes
	const requestedId: unknown = ctx.body?.userId;
	const targetId = Number(requestedId);
	const session = await getSessionFromCtx(ctx);
	if (!session || !Number.isSafeInteger(targetId) || String(targetId) !== String(requestedId)) {
		throw new APIError('FORBIDDEN');
	}

	const users = await systemDb
		.select({ organizationId: schema.user.organizationId })
		.from(schema.user)
		.where(inArray(schema.user.id, [Number(session.user.id), targetId]));
	if (users.length !== 2 || users[0].organizationId !== users[1].organizationId) {
		throw new APIError('FORBIDDEN');
	}
});

function createAuth() {
	return betterAuth({
		// Signing in looks users up across organizations, so better-auth uses the owner connection
		database: drizzleAdapter(systemDb, {
			provider: 'pg',
			schema: {
				user: schema.user,
				verification: schema.verification,
				account: schema.account,
				session: schema.session
			}
		}),
		advanced: {
			database: {
				generateId: 'serial'
			}
		},
		hooks: {
			before: limitAdminEndpoints
		},
		plugins: [
			magicLink({
				// Nobody signs themselves up: a magic link only signs in an existing account
				disableSignUp: true,
				sendMagicLink: async ({ email, url }: { email: string; url: string }): Promise<void> => {
					await sendEmailToUser(email, 'Magic Link', `<p>${url}</p>`, `<p>${url}</p>`);
				}
			}),
			admin({
				adminRoles: ['admin']
			}),
			sveltekitCookies(getRequestEvent)
		],
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			requireEmailVerification: true,
			autoSignIn: false
		},
		emailVerification: {
			sendOnSignUp: true,
			sendVerificationEmail: async ({
				user,
				url
			}: {
				user: BetterAuthUser;
				url: string;
			}): Promise<void> => {
				await sendEmailToUser(user.email, 'Verification Sign up', `<p>${url}</p>`, `<p>${url}</p>`);
			}
		},
		user: {
			additionalFields: {
				notificationPreferences: {
					type: 'json',
					required: false,
					defaultValue: defaultNotificationPreferences
				}
			}
		}
	});
}

let instance: ReturnType<typeof createAuth> | undefined;

/**
 * Creates the auth instance on first use instead of at import: better-auth requires
 * BETTER_AUTH_SECRET when it is created, and the build has no secrets.
 */
export function getAuth() {
	instance ??= createAuth();
	return instance;
}

/**
 * The signed-in user, their session and the request's tenant transaction, which only sees the
 * user's organization. Sends visitors without a session to the login page.
 */
export function requireAuth(locals: App.Locals): { user: User; session: Session; db: TenantDb } {
	if (!locals.user || !locals.session || !locals.db) {
		throw redirect(302, '/login');
	}

	return {
		user: locals.user,
		session: locals.session,
		db: locals.db
	};
}
