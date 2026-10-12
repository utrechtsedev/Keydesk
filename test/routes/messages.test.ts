import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import {
	Browser,
	createRequester,
	createTicket,
	defaults,
	ensureOrganization,
	signIn
} from '../app.js';

let browser: Browser;

beforeAll(async () => {
	await ensureOrganization();
	({ browser } = await signIn('user'));
});

afterAll(async () => {
	await db.$client.end();
});

const typed = '<img src=x onerror="alert(1)">\nHallo';
const stored = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;<br>Hallo';

describe('messages written in the dashboard', () => {
	it('are stored as the text that was typed when replying', async () => {
		const ticket = await createTicket({ subject: 'Reply to me' });
		const form = new FormData();
		form.set('message', typed);
		form.set('isPrivate', 'false');
		form.set('ticketId', String(ticket.id));

		const response = await browser.fetch(`/api/tickets/${ticket.id}/messages`, {
			method: 'POST',
			body: form
		});

		expect(response.status).toBe(201);
		const messages = await db
			.select({ message: schema.ticketMessage.message })
			.from(schema.ticketMessage)
			.where(eq(schema.ticketMessage.ticketId, ticket.id));
		expect(messages.map((row) => row.message)).toEqual([stored]);
	});

	it('are stored as the text that was typed when creating a ticket', async () => {
		const requester = await createRequester();
		const { status, priority } = await defaults();
		const subject = `Created with markup ${crypto.randomUUID()}`;
		const form = new FormData();
		form.set('subject', subject);
		form.set('message', typed);
		form.set('isPrivate', 'false');
		form.set('requesterId', String(requester.id));
		form.set('statusId', String(status.id));
		form.set('priorityId', String(priority.id));
		form.set('channel', 'dashboard');
		form.set('targetDate', new Date(Date.now() + 86_400_000).toISOString());
		form.set('tags', '[]');

		const response = await browser.fetch('/api/tickets', { method: 'POST', body: form });

		expect(response.status).toBe(201);
		const [created] = await db
			.select({ message: schema.ticketMessage.message })
			.from(schema.ticketMessage)
			.innerJoin(schema.ticket, eq(schema.ticketMessage.ticketId, schema.ticket.id))
			.where(eq(schema.ticket.subject, subject));
		expect(created.message).toBe(stored);
	});
});
