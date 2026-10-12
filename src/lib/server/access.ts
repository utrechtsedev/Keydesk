import { redirect, type RequestEvent } from '@sveltejs/kit';

/**
 * - `public`: anyone
 * - `user`: any signed-in user
 * - `admin`: signed-in users with the admin role
 */
export type Access = 'public' | 'user' | 'admin';

/**
 * What a route requires. Everything not listed here needs a signed-in user, so a new route stays
 * closed until it is opened here on purpose.
 */
export function requiredAccess(routeId: string, method: string): Access {
	if (routeId === '/(index)/(auth)/login' || routeId === '/(index)/(auth)/invitation/[token]') {
		return 'public';
	}
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

/**
 * Endpoints answer a refusal with a status code; pages, and the routes a browser navigates to
 * (such as the steps of connecting a mailbox), send the visitor somewhere else
 */
export function isEndpoint(routeId: string): boolean {
	return routeId.startsWith('/(index)/api/') || routeId === '/(index)/logo';
}

/**
 * Checks the request against `requiredAccess`, after `event.locals.user` is set. Returns the
 * refusal for an endpoint, or throws the redirect for a page; returns nothing when the request
 * may continue.
 */
export function refuseAccess(event: RequestEvent): Response | undefined {
	const routeId = event.route.id;
	// No route: better-auth's own endpoints, or a page that doesn't exist
	if (!routeId) return;

	const access = requiredAccess(routeId, event.request.method);
	if (access === 'public') return;

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
