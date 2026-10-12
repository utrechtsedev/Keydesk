import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';
import {
	Browser,
	createOrganization,
	createRequester,
	createTicket,
	createUser,
	defaults,
	inOrganization,
	signIn,
	systemDb,
	type TestOrganization
} from '../app.js';

let ours: TestOrganization;
let theirs: TestOrganization;
let browser: Browser;
let theirTicket: typeof schema.ticket.$inferSelect;

beforeAll(async () => {
	ours = await createOrganization('Ours');
	theirs = await createOrganization('Theirs');
	({ browser } = await signIn(ours, 'admin'));
	theirTicket = await createTicket(theirs, { subject: `Their secret ${crypto.randomUUID()}` });
});

afterAll(async () => {
	await systemDb.$client.end();
});

async function readTheirTicket() {
	const [ticket] = await systemDb
		.select()
		.from(schema.ticket)
		.where(eq(schema.ticket.id, theirTicket.id));
	return ticket;
}

describe('in the database', () => {
	it('a tenant transaction only sees its own organization', async () => {
		const ourTicket = await createTicket(ours, { subject: 'Ours' });

		const visible = await inOrganization(ours, (db) =>
			db.select({ id: schema.ticket.id }).from(schema.ticket)
		);

		expect(visible.map((ticket) => ticket.id)).toContain(ourTicket.id);
		expect(visible.map((ticket) => ticket.id)).not.toContain(theirTicket.id);
	});

	it('refuses a row written for another organization', async () => {
		await expect(
			inOrganization(ours, (db) =>
				db
					.insert(schema.requester)
					.values({ organizationId: theirs.id, email: 'planted@example.com' })
			)
		).rejects.toThrow();
	});

	it('refuses a reference to another organization', async () => {
		const ourTicket = await createTicket(ours, { subject: 'Ours' });
		const theirUser = await createUser(theirs, 'user');

		await expect(
			inOrganization(ours, (db) =>
				db
					.update(schema.ticket)
					.set({ assigneeId: theirUser.id })
					.where(eq(schema.ticket.id, ourTicket.id))
			)
		).rejects.toThrow();
	});

	it('refuses a row written outside a tenant transaction', async () => {
		await expect(
			systemDb.insert(schema.requester).values({ email: 'nobody@example.com' })
		).rejects.toThrow();
	});
});

describe('through the app', () => {
	it('leaves their tickets out of the ticket list', async () => {
		// Not searching for it: the page shows the search text, which would match by itself
		const response = await browser.fetch('/dashboard/tickets?pageSize=100');

		expect(response.status).toBe(200);
		expect(await response.text()).not.toContain(theirTicket.subject);
	});

	it('does not show their ticket', async () => {
		const response = await browser.fetch(`/dashboard/tickets/${theirTicket.id}`, {
			headers: { accept: 'text/html' }
		});

		expect(response.status).not.toBe(200);
		expect(await response.text()).not.toContain(theirTicket.subject);
	});

	it('leaves their tickets out of the export', async () => {
		const response = await browser.fetch('/api/tickets/export');

		expect(response.status).toBe(200);
		expect(await response.text()).not.toContain(theirTicket.subject);
	});

	it('does not change their ticket', async () => {
		const { priority } = await defaults(ours);

		await browser.sendJson('PATCH', `/api/tickets/${theirTicket.id}`, {
			subject: 'Taken over',
			priorityId: priority.id
		});

		expect((await readTheirTicket()).subject).toBe(theirTicket.subject);
	});

	it('does not delete their ticket', async () => {
		await browser.sendJson('DELETE', '/api/tickets/bulk', { ids: [theirTicket.id] });

		expect(await readTheirTicket()).toBeDefined();
	});

	it('does not assign our ticket to one of their users', async () => {
		const ourTicket = await createTicket(ours, { subject: 'Ours' });
		const theirUser = await createUser(theirs, 'user');

		await browser.sendJson('PATCH', `/api/tickets/${ourTicket.id}`, { assigneeId: theirUser.id });

		const [after] = await systemDb
			.select()
			.from(schema.ticket)
			.where(eq(schema.ticket.id, ourTicket.id));
		expect(after.assigneeId).toBeNull();
	});

	it('only lists our own settings', async () => {
		const theirStatuses = await inOrganization(theirs, (db) =>
			db.select({ id: schema.status.id }).from(schema.status)
		);

		const response = await browser.fetch('/api/settings/statuses');
		const { data } = (await response.json()) as { data: { id: number }[] };

		expect(data.length).toBeGreaterThan(0);
		expect(data.map((status) => status.id)).not.toEqual(
			expect.arrayContaining(theirStatuses.map((status) => status.id))
		);
	});

	it('creates new tickets in our organization with our numbering', async () => {
		const requester = await createRequester(ours);
		const { status, priority } = await defaults(ours);
		const subject = `Numbered ${crypto.randomUUID()}`;
		const form = new FormData();
		form.set('subject', subject);
		form.set('message', 'Hello');
		form.set('isPrivate', 'false');
		form.set('requesterId', String(requester.id));
		form.set('statusId', String(status.id));
		form.set('priorityId', String(priority.id));
		form.set('channel', 'dashboard');
		form.set('targetDate', new Date(Date.now() + 86_400_000).toISOString());
		form.set('tags', '[]');

		const response = await browser.fetch('/api/tickets', { method: 'POST', body: form });

		expect(response.status).toBe(201);
		const [created] = await systemDb
			.select()
			.from(schema.ticket)
			.where(eq(schema.ticket.subject, subject));
		expect(created.organizationId).toBe(ours.id);
		const ourNumbers = await inOrganization(ours, (db) =>
			db.select({ ticketNumber: schema.ticket.ticketNumber }).from(schema.ticket)
		);
		expect(new Set(ourNumbers.map((row) => row.ticketNumber)).size).toBe(ourNumbers.length);
	});
});
