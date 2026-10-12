import { inject } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { hashPassword } from '#lib/utils/password.js';

export const appUrl = inject('appUrl');

/**
 * A browser talking to the app: it keeps the session cookie and sends the Origin header that
 * SvelteKit and better-auth check on writes.
 */
export class Browser {
	constructor(private readonly cookie = '') {}

	fetch(path: string, init: RequestInit = {}): Promise<Response> {
		const headers = new Headers(init.headers);
		headers.set('origin', appUrl);
		if (this.cookie) headers.set('cookie', this.cookie);
		return fetch(new URL(path, appUrl), { ...init, headers, redirect: 'manual' });
	}

	sendJson(method: string, path: string, body: unknown): Promise<Response> {
		return this.fetch(path, {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	}
}

const notificationPreferences = {
	dashboard: { ticketCreated: true, itemAssigned: true, itemUpdated: true, itemClosed: true },
	email: { ticketCreated: true, itemAssigned: true, itemUpdated: true, itemClosed: true }
};

export async function createUser(role: 'admin' | 'user' = 'user', password?: string) {
	const [user] = await db
		.insert(schema.user)
		.values({
			name: `Test ${role}`,
			email: `${role}-${crypto.randomUUID()}@keydesk.test`,
			emailVerified: true,
			role,
			banned: false,
			notificationPreferences
		})
		.returning();

	if (password) {
		await db.insert(schema.account).values({
			accountId: String(user.id),
			providerId: 'credential',
			userId: user.id,
			password: await hashPassword(password)
		});
	}

	return user;
}

/** Creates a user and signs in through better-auth, like the login page does */
export async function signIn(role: 'admin' | 'user' = 'admin') {
	const password = 'Keydesk-test-123';
	const user = await createUser(role, password);

	const response = await new Browser().sendJson('POST', '/api/auth/sign-in/email', {
		email: user.email,
		password
	});
	if (!response.ok) {
		throw new Error(`Sign-in failed with ${response.status}: ${await response.text()}`);
	}

	const cookie = response.headers
		.getSetCookie()
		.map((header) => header.split(';')[0])
		.join('; ');
	return { browser: new Browser(cookie), user };
}

/** The dashboard sends visitors to /setup until the organization settings exist */
export async function ensureOrganization() {
	await db
		.insert(schema.config)
		.values({
			key: 'organization',
			value: {
				name: 'Test BV',
				domain: 'keydesk.test',
				address: 'Teststraat 1',
				country: 'NL',
				city: 'Utrecht',
				zipCode: '1234 AB',
				language: 'nl',
				timezone: 'Europe/Amsterdam'
			}
		})
		.onConflictDoNothing();
}

/** The default status and the first priority that db:init creates */
export async function defaults() {
	const [status] = await db.select().from(schema.status).where(eq(schema.status.isDefault, true));
	const [priority] = await db.select().from(schema.priority).limit(1);
	return { status, priority };
}

export async function createRequester() {
	const [requester] = await db
		.insert(schema.requester)
		.values({ name: 'Test Requester', email: `requester-${crypto.randomUUID()}@keydesk.test` })
		.returning();
	return requester;
}

export async function createTicket(values: { subject: string; assigneeId?: number }) {
	const requester = await createRequester();
	const { status, priority } = await defaults();

	const [ticket] = await db
		.insert(schema.ticket)
		.values({
			subject: values.subject,
			requesterId: requester.id,
			assigneeId: values.assigneeId ?? null,
			statusId: status.id,
			priorityId: priority.id,
			channel: 'dashboard',
			targetDate: new Date(Date.now() + 86_400_000)
		})
		.returning();
	return ticket;
}

export async function createTask(values: {
	title: string;
	ticketId?: number;
	parentTaskId?: number;
}) {
	const { status, priority } = await defaults();

	const [task] = await db
		.insert(schema.task)
		.values({
			title: values.title,
			ticketId: values.ticketId ?? null,
			parentTaskId: values.parentTaskId ?? null,
			statusId: status.id,
			priorityId: priority.id,
			dueDate: new Date(Date.now() + 86_400_000)
		})
		.returning();
	return task;
}
