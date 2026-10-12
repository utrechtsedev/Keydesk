import { betterAuth, type Session, type User as BetterAuthUser } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { admin, magicLink } from 'better-auth/plugins';
import { inArray } from 'drizzle-orm';
import { sendEmailToUser } from './email/email.js';
import { messageEmail } from './email/compose.js';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import type { SystemDb, TenantDb } from './db/database.js';
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
const limitAdminEndpoints = (systemDb: SystemDb) =>
	createAuthMiddleware(async (ctx) => {
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

/** How long a sign-in link from the login page works */
const MAGIC_LINK_MINUTES = 5;

/**
 * better-auth for one request (or other unit of work), on that request's database connection;
 * see `connect`. Creating it takes a fraction of a millisecond.
 */
export function createAuth(systemDb: SystemDb) {
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
			before: limitAdminEndpoints(systemDb)
		},
		plugins: [
			magicLink({
				// Nobody signs themselves up: a magic link only signs in an existing account
				disableSignUp: true,
				expiresIn: MAGIC_LINK_MINUTES * 60,
				sendMagicLink: async ({ email, url }: { email: string; url: string }): Promise<void> => {
					await sendEmailToUser(systemDb, email, (organization) =>
						messageEmail({
							organization,
							subject: `Sign in to ${organization.name}`,
							title: `Sign in to ${organization.name}`,
							message: `Use the button below to sign in to Keydesk. The link works once, for ${MAGIC_LINK_MINUTES} minutes.`,
							action: { label: 'Sign in', url },
							footer:
								"You're receiving this email because someone asked to sign in with this address. If that wasn't you, you can ignore it."
						})
					);
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
				await sendEmailToUser(systemDb, user.email, (organization) =>
					messageEmail({
						organization,
						subject: 'Confirm your email address',
						title: 'Confirm your email address',
						message: `Confirm that this is your email address for ${organization.name} on Keydesk.`,
						action: { label: 'Confirm email address', url },
						footer:
							"You're receiving this email because this address was used for a Keydesk account."
					})
				);
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

export type Auth = ReturnType<typeof createAuth>;

/**
 * better-auth signs sessions with BETTER_AUTH_SECRET. The server checks it at startup, so a
 * missing secret stops it there instead of failing the first request.
 */
export function assertAuthSecret(): void {
	if (!process.env.BETTER_AUTH_SECRET) {
		throw new Error('BETTER_AUTH_SECRET is not set.');
	}
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
