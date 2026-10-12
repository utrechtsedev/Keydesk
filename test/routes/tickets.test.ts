import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';
import {
	Browser,
	createOrganization,
	createRequester,
	createTask,
	createTicket,
	createUser,
	defaults,
	signIn,
	systemDb,
	type TestOrganization
} from '../app.js';

let organization: TestOrganization;
let browser: Browser;

beforeAll(async () => {
	organization = await createOrganization();
	({ browser } = await signIn(organization, 'admin'));
});

afterAll(async () => {
	await systemDb.$client.end();
});

const unique = (text: string) => `${text} ${crypto.randomUUID()}`;

describe('ticket search', () => {
	it('finds a ticket by subject', async () => {
		const ticket = await createTicket(organization, { subject: unique('Printer kapot') });

		const response = await browser.fetch(
			`/dashboard/tickets?search=${encodeURIComponent(ticket.subject)}`
		);

		expect(response.status).toBe(200);
		expect(await response.text()).toContain(ticket.subject);
	});

	it('finds a ticket by its number', async () => {
		const ticket = await createTicket(organization, { subject: unique('Scanner kapot') });

		const response = await browser.fetch(`/dashboard/tickets?search=${ticket.ticketNumber}`);

		expect(response.status).toBe(200);
		expect(await response.text()).toContain(ticket.subject);
	});
});

describe('ticket export', () => {
	it('exports the tickets that match the search as CSV', async () => {
		const ticket = await createTicket(organization, { subject: unique('Export me') });

		const response = await browser.fetch(
			`/api/tickets/export?search=${encodeURIComponent(ticket.subject)}`
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/csv');
		const [header, ...rows] = (await response.text()).trimEnd().split('\n');
		expect(header).toMatch(/^Ticket Number,Subject,Requester,/);
		expect(rows).toEqual([expect.stringContaining(`${ticket.ticketNumber},${ticket.subject},`)]);
	});
});

describe('bulk delete', () => {
	it('deletes the selected tickets', async () => {
		const ids = [
			(await createTicket(organization, { subject: unique('Delete me') })).id,
			(await createTicket(organization, { subject: unique('Delete me too') })).id
		];

		const response = await browser.sendJson('DELETE', '/api/tickets/bulk', { ids });

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ deleted: 2 });
		const remaining = await systemDb
			.select()
			.from(schema.ticket)
			.where(inArray(schema.ticket.id, ids));
		expect(remaining).toHaveLength(0);
	});

	it('deletes the tasks and subtasks of a deleted ticket', async () => {
		const ticket = await createTicket(organization, { subject: unique('With tasks') });
		const task = await createTask(organization, { title: unique('Task'), ticketId: ticket.id });
		const subtask = await createTask(organization, {
			title: unique('Subtask'),
			parentTaskId: task.id
		});

		const response = await browser.sendJson('DELETE', '/api/tickets/bulk', { ids: [ticket.id] });

		expect(response.status).toBe(200);
		const remaining = await systemDb
			.select()
			.from(schema.task)
			.where(inArray(schema.task.id, [task.id, subtask.id]));
		expect(remaining).toHaveLength(0);
	});

	it('keeps the archived email of a deleted ticket', async () => {
		const ticket = await createTicket(organization, { subject: unique('From email') });
		const [archived] = await systemDb
			.insert(schema.email)
			.values({
				organizationId: organization.id,
				providerMessageId: crypto.randomUUID(),
				fromAddress: 'customer@example.com',
				subject: ticket.subject,
				ticketId: ticket.id
			})
			.returning();

		const response = await browser.sendJson('DELETE', '/api/tickets/bulk', { ids: [ticket.id] });

		expect(response.status).toBe(200);
		const [kept] = await systemDb
			.select()
			.from(schema.email)
			.where(eq(schema.email.id, archived.id));
		expect(kept.ticketId).toBeNull();
	});

	it('deletes the selected tasks with their subtasks', async () => {
		const task = await createTask(organization, { title: unique('Delete me') });
		const subtask = await createTask(organization, {
			title: unique('Subtask'),
			parentTaskId: task.id
		});

		const response = await browser.sendJson('DELETE', '/api/tasks/bulk', { ids: [task.id] });

		expect(response.status).toBe(200);
		const remaining = await systemDb
			.select()
			.from(schema.task)
			.where(inArray(schema.task.id, [task.id, subtask.id]));
		expect(remaining).toHaveLength(0);
	});
});

describe('bulk tags', () => {
	it('tags the selected tickets', async () => {
		const ticket = await createTicket(organization, { subject: unique('Tag me') });
		const tagName = unique('urgent');

		const response = await browser.sendJson('POST', '/api/tickets/tags', {
			ids: [ticket.id],
			tags: [tagName]
		});

		expect(response.status).toBe(200);
		const tags = await systemDb
			.select({ name: schema.tag.name })
			.from(schema.ticketTag)
			.innerJoin(schema.tag, eq(schema.ticketTag.tagId, schema.tag.id))
			.where(eq(schema.ticketTag.ticketId, ticket.id));
		expect(tags.map((tag) => tag.name)).toEqual([tagName]);
	});

	it('tags the selected tasks', async () => {
		const task = await createTask(organization, { title: unique('Tag me') });
		const tagName = unique('urgent');

		const response = await browser.sendJson('POST', '/api/tasks/tags', {
			ids: [task.id],
			tags: [tagName]
		});

		expect(response.status).toBe(200);
		const tags = await systemDb
			.select({ name: schema.tag.name })
			.from(schema.taskTag)
			.innerJoin(schema.tag, eq(schema.taskTag.tagId, schema.tag.id))
			.where(eq(schema.taskTag.taskId, task.id));
		expect(tags.map((tag) => tag.name)).toEqual([tagName]);
	});
});

describe('notifications', () => {
	it('notifies the assignee of a new ticket on the dashboard', async () => {
		const assignee = await createUser(organization, 'user');
		const requester = await createRequester(organization);
		const { status, priority } = await defaults(organization);

		const form = new FormData();
		form.set('subject', unique('New ticket'));
		form.set('message', '<p>Hello</p>');
		form.set('isPrivate', 'false');
		form.set('requesterId', String(requester.id));
		form.set('statusId', String(status.id));
		form.set('priorityId', String(priority.id));
		form.set('assigneeId', String(assignee.id));
		form.set('channel', 'dashboard');
		form.set('targetDate', new Date(Date.now() + 86_400_000).toISOString());
		form.set('tags', '[]');

		const response = await browser.fetch('/api/tickets', { method: 'POST', body: form });
		expect(response.status).toBe(201);

		await expect
			.poll(
				async () => {
					const rows = await systemDb
						.select({ title: schema.notification.title })
						.from(schema.userNotification)
						.innerJoin(
							schema.notification,
							eq(schema.userNotification.notificationId, schema.notification.id)
						)
						.where(eq(schema.userNotification.userId, assignee.id));
					return rows.map((row) => row.title);
				},
				{ timeout: 15_000, interval: 250 }
			)
			.toContain('Ticket assigned to you');
	});
});
