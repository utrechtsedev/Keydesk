import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';

/**
 * - `public`: anyone
 * - `setup`: the setup wizard, only until the first account exists
 * - `user`: any signed-in user
 * - `admin`: signed-in users with the admin role
 */
export type Access = 'public' | 'setup' | 'user' | 'admin';

/**
 * What a route requires. Everything not listed here needs a signed-in user, so a new route stays
 * closed until it is opened here on purpose.
 */
export function requiredAccess(routeId: string, method: string): Access {
	if (routeId === '/(index)/(auth)/login') return 'public';
	if (routeId === '/(index)/setup' || routeId.startsWith('/(index)/setup/')) return 'setup';
	if (routeId === '/(index)/logo') return method === 'GET' ? 'user' : 'admin';
	if (
		routeId.startsWith('/(index)/api/settings/') ||
		routeId === '/dashboard/settings' ||
		routeId.startsWith('/dashboard/settings/')
	) {
		return 'admin';
	}
	return 'user';
}

/** The setup wizard shows and uploads the logo before any account exists */
function usableDuringSetup(routeId: string, method: string): boolean {
	return requiredAccess(routeId, method) === 'setup' || routeId === '/(index)/logo';
}

/** Endpoints answer a refusal with a status code; pages send the visitor somewhere else */
function isEndpoint(routeId: string): boolean {
	return routeId.startsWith('/(index)/api/') || routeId === '/(index)/logo';
}

async function hasAccounts(): Promise<boolean> {
	const [account] = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
	return account !== undefined;
}

/**
 * Checks the request against `requiredAccess`, after `event.locals.user` is set. Returns the
 * refusal for an endpoint, or throws the redirect or 404 for a page; returns nothing when the
 * request may continue.
 */
export async function refuseAccess(event: RequestEvent): Promise<Response | undefined> {
	const routeId = event.route.id;
	// No route: better-auth's own endpoints, or a page that doesn't exist
	if (!routeId) return;

	const method = event.request.method;
	const access = requiredAccess(routeId, method);
	if (access === 'public') return;

	if (usableDuringSetup(routeId, method) && !(await hasAccounts())) return;
	if (access === 'setup') error(404, 'Not Found');

	const { user } = event.locals;
	if (!user) {
		if (isEndpoint(routeId)) return Response.json({ message: 'Unauthorized' }, { status: 401 });
		redirect(303, '/login');
	}

	if (access === 'admin' && user.role !== 'admin') {
		if (isEndpoint(routeId)) return Response.json({ message: 'Forbidden' }, { status: 403 });
		redirect(303, '/dashboard');
	}
}
