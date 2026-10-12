import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { requiredAccess, type Access } from '#lib/server/access.js';
import { Browser, createOrganization, signIn, systemDb } from '../app.js';

interface Route {
	id: string;
	url: string;
	method: string;
	kind: 'endpoint' | 'page';
	access: Access;
}

/** Every route in src/routes with each method it answers, the way SvelteKit names them */
function discoverRoutes(): Route[] {
	const routesDir = 'src/routes';
	const routes: Route[] = [];

	for (const file of readdirSync(routesDir, { recursive: true, encoding: 'utf8' })) {
		const directory = dirname(file);
		const id = directory === '.' ? '/' : `/${directory.split(sep).join('/')}`;
		const url =
			id
				.split('/')
				.filter((segment) => segment !== '' && !/^\(.+\)$/.test(segment))
				.map((segment) => segment.replace(/^\[fileName\]$/, 'file.txt').replace(/^\[\w+\]$/, '1'))
				.reduce((path, segment) => `${path}/${segment}`, '') || '/';

		const name = basename(file);
		if (name === '+server.ts') {
			const source = readFileSync(join(routesDir, file), 'utf8');
			const methods = source.matchAll(
				/export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g
			);
			for (const [, method] of methods) {
				routes.push({ id, url, method, kind: 'endpoint', access: requiredAccess(id, method) });
			}
		} else if (name === '+page.svelte' || name === '+page.server.ts') {
			if (!routes.some((route) => route.id === id && route.kind === 'page')) {
				routes.push({ id, url, method: 'GET', kind: 'page', access: requiredAccess(id, 'GET') });
			}
		}
	}

	return routes;
}

const routes = discoverRoutes();
const label = (route: Route) => `${route.method} ${route.url} (${route.kind})`;

function request(browser: Browser, route: Route) {
	return browser.fetch(route.url, {
		method: route.method,
		// Pages are fetched the way a browser does; endpoints the way the app's own client does
		headers: route.kind === 'page' ? { accept: 'text/html' } : { accept: 'application/json' }
	});
}

let user: Browser;

beforeAll(async () => {
	({ browser: user } = await signIn(await createOrganization(), 'user'));
});

afterAll(async () => {
	await systemDb.$client.end();
});

describe('route discovery', () => {
	it('finds the routes', () => {
		expect(routes.filter((route) => route.kind === 'endpoint').length).toBeGreaterThan(40);
		expect(routes.filter((route) => route.kind === 'page').length).toBeGreaterThan(20);
	});

	it('leaves only the login and invitation pages open to everyone', () => {
		const open = routes.filter((route) => route.access === 'public').map((route) => route.id);
		expect([...new Set(open)].sort()).toEqual([
			'/(index)/(auth)/invitation/[token]',
			'/(index)/(auth)/login'
		]);
	});
});

describe('without a session', () => {
	const anonymous = new Browser();

	it.each(
		routes
			.filter((route) => route.kind === 'endpoint' && ['user', 'admin'].includes(route.access))
			.map((route) => [label(route), route])
	)('%s answers 401', async (_, route) => {
		expect((await request(anonymous, route)).status).toBe(401);
	});

	it.each(
		routes
			.filter((route) => route.kind === 'page' && ['user', 'admin'].includes(route.access))
			.map((route) => [label(route), route])
	)('%s sends the visitor to the login page', async (_, route) => {
		const response = await request(anonymous, route);
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/login');
	});
});

describe('as a user without the admin role', () => {
	it.each(
		routes
			.filter((route) => route.kind === 'endpoint' && route.access === 'admin')
			.map((route) => [label(route), route])
	)('%s answers 403', async (_, route) => {
		expect((await request(user, route)).status).toBe(403);
	});

	it.each(
		routes
			.filter((route) => route.kind === 'page' && route.access === 'admin')
			.map((route) => [label(route), route])
	)('%s sends the user to the dashboard', async (_, route) => {
		const response = await request(user, route);
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/dashboard');
	});
});
