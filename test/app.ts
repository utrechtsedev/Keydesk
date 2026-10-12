import { inject } from 'vitest';
import { desc, eq } from 'drizzle-orm';
import { systemDb, withTenant, type TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { createOrganizationDefaults } from '#lib/server/db/initialize.js';
import { allocateTicketNumber } from '#lib/server/services/ticket.service.js';
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

export type TestOrganization = typeof schema.organization.$inferSelect;

/** A new organization with its default settings, like `bun run org:create` makes */
export async function createOrganization(name = `Test ${crypto.randomUUID()}`) {
	const [organization] = await systemDb.insert(schema.organization).values({ name }).returning();
	await withTenant(organization.id, (db) => createOrganizationDefaults(db, () => {}));
	return organization;
}

/** Runs test setup or checks inside the organization's tenant transaction */
export function inOrganization<T>(
	organization: TestOrganization,
	work: (db: TenantDb) => Promise<T>
): Promise<T> {
	return withTenant(organization.id, work);
}

const notificationPreferences = {
	dashboard: { ticketCreated: true, itemAssigned: true, itemUpdated: true, itemClosed: true },
	email: { ticketCreated: true, itemAssigned: true, itemUpdated: true, itemClosed: true }
};

export async function createUser(
	organization: TestOrganization,
	role: 'admin' | 'user' = 'user',
	password?: string
) {
	const user = await inOrganization(organization, async (db) => {
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
		return user;
	});

	if (password) {
		// better-auth's tables are outside the tenant role's reach
		await systemDb.insert(schema.account).values({
			accountId: String(user.id),
			providerId: 'credential',
			userId: user.id,
			password: await hashPassword(password)
		});
	}

	return user;
}

/** Creates a user in the organization and signs in through better-auth, like the login page does */
export async function signIn(organization: TestOrganization, role: 'admin' | 'user' = 'admin') {
	const password = 'Keydesk-test-123';
	const user = await createUser(organization, role, password);

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

/** The organization's default status and priority */
export function defaults(organization: TestOrganization) {
	return inOrganization(organization, async (db) => {
		const [status] = await db.select().from(schema.status).where(eq(schema.status.isDefault, true));
		const [priority] = await db
			.select()
			.from(schema.priority)
			.orderBy(desc(schema.priority.isDefault))
			.limit(1);
		return { status, priority };
	});
}

export function createRequester(organization: TestOrganization) {
	return inOrganization(organization, async (db) => {
		const [requester] = await db
			.insert(schema.requester)
			.values({ name: 'Test Requester', email: `requester-${crypto.randomUUID()}@keydesk.test` })
			.returning();
		return requester;
	});
}

export async function createTicket(
	organization: TestOrganization,
	values: { subject: string; assigneeId?: number }
) {
	const requester = await createRequester(organization);
	const { status, priority } = await defaults(organization);

	return inOrganization(organization, async (db) => {
		const [ticket] = await db
			.insert(schema.ticket)
			.values({
				ticketNumber: await allocateTicketNumber(db, organization.id),
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
	});
}

export async function createTask(
	organization: TestOrganization,
	values: { title: string; ticketId?: number; parentTaskId?: number }
) {
	const { status, priority } = await defaults(organization);

	return inOrganization(organization, async (db) => {
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
	});
}
