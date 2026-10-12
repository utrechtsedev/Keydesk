import { readdirSync } from 'node:fs';
import { basename, dirname, sep } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { systemDb } from '#lib/server/db/database.js';
import {
	Browser,
	createOrganization,
	createTask,
	createTicket,
	signIn,
	type TestOrganization
} from '../app.js';

/** Every page under /dashboard, as SvelteKit route ids */
const pageRouteIds = [
	...new Set(
		readdirSync('src/routes/dashboard', { recursive: true, encoding: 'utf8' })
			.filter((file) => ['+page.svelte', '+page.server.ts'].includes(basename(file)))
			.map((file) => {
				const directory = dirname(file);
				return directory === '.' ? '/dashboard' : `/dashboard/${directory.split(sep).join('/')}`;
			})
	)
].sort();

let organization: TestOrganization;
let admin: Browser;
const ids: Record<string, number> = {};

beforeAll(async () => {
	organization = await createOrganization();
	const signedIn = await signIn(organization, 'admin');
	admin = signedIn.browser;
	ids.user = signedIn.user.id;
	const ticket = await createTicket(organization, { subject: 'A ticket to open' });
	ids.ticket = ticket.id;
	await createTask(organization, { title: 'A task to list', ticketId: ticket.id });
});

afterAll(async () => {
	await systemDb.$client.end();
});

/** Fills in a route's parameters with rows of the test organization */
function urlFor(routeId: string) {
	return routeId
		.replace('/tickets/[id]', `/tickets/${ids.ticket}`)
		.replace('/users/[id]', `/users/${ids.user}`);
}

it('finds the dashboard pages', () => {
	expect(pageRouteIds.length).toBeGreaterThan(20);
});

it.each(pageRouteIds)('%s renders for an admin', async (routeId) => {
	const url = urlFor(routeId);
	expect(url, 'every parameter should be filled in').not.toMatch(/\[/);

	const response = await admin.fetch(url, { headers: { accept: 'text/html' } });

	// Some pages send the admin on, such as the settings index to its first page
	expect([200, 302, 303, 307]).toContain(response.status);
	if (response.status !== 200) {
		expect(response.headers.get('location')).toMatch(/^\/dashboard\//);
	}
});
