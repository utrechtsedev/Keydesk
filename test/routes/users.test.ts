import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';
import {
	Browser,
	cookies,
	createOrganization,
	createTicket,
	createUser,
	signIn,
	systemDb,
	type TestOrganization
} from '../app.js';

let ours: TestOrganization;
let theirs: TestOrganization;
let admin: Browser;
let adminUser: schema.User;

beforeAll(async () => {
	ours = await createOrganization('Ours');
	theirs = await createOrganization('Theirs');
	({ browser: admin, user: adminUser } = await signIn(ours, 'admin'));
});

afterAll(async () => {
	await systemDb.$client.end();
});

const newEmail = () => `invitee-${crypto.randomUUID()}@keydesk.test`;
const password = 'Keydesk-invited-1';

function invite(values: Record<string, string> = {}) {
	return admin.sendJson('POST', '/api/settings/users', {
		name: 'Invitee',
		email: newEmail(),
		role: 'user',
		...values
	});
}

const tokenOf = (invitationUrl: string) => new URL(invitationUrl).pathname.split('/').at(-1)!;

/** Invites a user; the tests have no mail settings, so the response carries the link */
async function invitedUser() {
	const response = await invite();
	expect(response.status).toBe(201);
	const body = await response.json();
	return {
		id: body.data.id as number,
		email: body.data.email as string,
		token: tokenOf(body.invitationUrl)
	};
}

/** Submits the invitation page's form the way a browser does */
function setPassword(token: string, newPassword: string, confirmation = newPassword) {
	return new Browser().fetch(`/invitation/${token}`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html' },
		body: new URLSearchParams({ password: newPassword, confirmation })
	});
}

function invitationPage(token: string) {
	return new Browser().fetch(`/invitation/${token}`, { headers: { accept: 'text/html' } });
}

async function findUser(id: number) {
	const [user] = await systemDb.select().from(schema.user).where(eq(schema.user.id, id));
	return user;
}

async function isSignedIn(browser: Browser) {
	const response = await browser.fetch('/dashboard', { headers: { accept: 'text/html' } });
	return response.status === 200;
}

describe('inviting a user', () => {
	it('adds them to the organization without a password', async () => {
		const email = newEmail();

		const response = await invite({
			name: 'Jan Jansen',
			email: email.toUpperCase(),
			role: 'admin'
		});

		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.emailSent).toBe(false);
		expect(body.invitationUrl).toMatch(/\/invitation\/[\w-]{43}$/);
		expect(await findUser(body.data.id)).toMatchObject({
			organizationId: ours.id,
			name: 'Jan Jansen',
			email,
			role: 'admin',
			emailVerified: false
		});
		const accounts = await systemDb
			.select()
			.from(schema.account)
			.where(eq(schema.account.userId, body.data.id));
		expect(accounts).toEqual([]);
	});

	it('refuses an address that already has a user, in any organization', async () => {
		const theirUser = await createUser(theirs);

		const response = await invite({ email: theirUser.email });

		expect(response.status).toBe(409);
		expect((await findUser(theirUser.id)).organizationId).toBe(theirs.id);
	});

	it('refuses an unknown role', async () => {
		expect((await invite({ role: 'owner' })).status).toBe(400);
	});
});

describe('accepting an invitation', () => {
	it('shows who is invited to which organization', async () => {
		const { email, token } = await invitedUser();

		const response = await invitationPage(token);

		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain('Join Ours');
		expect(html).toContain(email);
	});

	it('sets the password and signs the user in', async () => {
		const { id, email, token } = await invitedUser();

		const response = await setPassword(token, password);

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/dashboard');
		expect(await isSignedIn(new Browser(cookies(response)))).toBe(true);
		expect((await findUser(id)).emailVerified).toBe(true);

		const signInAgain = await new Browser().sendJson('POST', '/api/auth/sign-in/email', {
			email,
			password
		});
		expect(signInAgain.status).toBe(200);
	});

	it('works only once', async () => {
		const { token } = await invitedUser();
		await setPassword(token, password);

		expect((await setPassword(token, 'Keydesk-someone-else')).status).toBe(410);
		expect(await (await invitationPage(token)).text()).toContain('Invitation not valid');
	});

	it('refuses a short or mistyped password and keeps the invitation', async () => {
		const { token } = await invitedUser();

		expect((await setPassword(token, 'short')).status).toBe(400);
		expect((await setPassword(token, password, `${password}x`)).status).toBe(400);
		expect((await setPassword(token, password)).status).toBe(303);
	});

	it('refuses an expired invitation', async () => {
		const { id, token } = await invitedUser();
		await systemDb
			.update(schema.invitation)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(schema.invitation.userId, id));

		expect(await (await invitationPage(token)).text()).toContain('Invitation not valid');
		expect((await setPassword(token, password)).status).toBe(410);
	});

	it('refuses a made-up token', async () => {
		expect(await (await invitationPage('made-up')).text()).toContain('Invitation not valid');
		expect((await setPassword('made-up', password)).status).toBe(410);
	});
});

describe('resending an invitation', () => {
	it('replaces the link', async () => {
		const { id, token } = await invitedUser();

		const response = await admin.fetch(`/api/settings/users/${id}/invitation`, { method: 'POST' });

		expect(response.status).toBe(200);
		const { invitationUrl } = await response.json();
		expect((await setPassword(token, password)).status).toBe(410);
		expect((await setPassword(tokenOf(invitationUrl), password)).status).toBe(303);
	});

	it('refuses once the password is set', async () => {
		const { id, token } = await invitedUser();
		await setPassword(token, password);

		const response = await admin.fetch(`/api/settings/users/${id}/invitation`, { method: 'POST' });

		expect(response.status).toBe(409);
	});

	it('refuses a user of another organization', async () => {
		const theirUser = await createUser(theirs);

		const response = await admin.fetch(`/api/settings/users/${theirUser.id}/invitation`, {
			method: 'POST'
		});

		expect(response.status).toBe(404);
	});
});

describe('managing users', () => {
	it('updates a user of the organization', async () => {
		const user = await createUser(ours);
		const email = newEmail();

		const response = await admin.sendJson('PATCH', `/api/settings/users/${user.id}`, {
			name: 'Renamed',
			email: email.toUpperCase(),
			role: 'admin'
		});

		expect(response.status).toBe(200);
		expect(await findUser(user.id)).toMatchObject({ name: 'Renamed', email, role: 'admin' });
	});

	it("doesn't let admins change their own role or disable themselves", async () => {
		const own = `/api/settings/users/${adminUser.id}`;

		expect((await admin.sendJson('PATCH', own, { role: 'user' })).status).toBe(403);
		expect((await admin.sendJson('PATCH', own, { banned: true })).status).toBe(403);
		expect((await admin.sendJson('PATCH', own, { role: 'admin', name: 'Still me' })).status).toBe(
			200
		);
		expect(await findUser(adminUser.id)).toMatchObject({ role: 'admin', banned: false });
	});

	it('refuses an email address another user has', async () => {
		const user = await createUser(ours);
		const theirUser = await createUser(theirs);

		const response = await admin.sendJson('PATCH', `/api/settings/users/${user.id}`, {
			email: theirUser.email
		});

		expect(response.status).toBe(409);
		expect((await findUser(user.id)).email).toBe(user.email);
	});

	it('signs a disabled user out', async () => {
		const { browser: member, user } = await signIn(ours, 'user');
		expect(await isSignedIn(member)).toBe(true);

		const response = await admin.sendJson('PATCH', `/api/settings/users/${user.id}`, {
			banned: true
		});

		expect(response.status).toBe(200);
		expect(await isSignedIn(member)).toBe(false);
		const sessions = await systemDb
			.select()
			.from(schema.session)
			.where(eq(schema.session.userId, user.id));
		expect(sessions).toEqual([]);
	});

	it('keeps a disabled user out even with a session left', async () => {
		const { browser: member, user } = await signIn(ours, 'user');
		await systemDb.update(schema.user).set({ banned: true }).where(eq(schema.user.id, user.id));

		expect(await isSignedIn(member)).toBe(false);
	});

	it('deletes a user and unassigns their tickets', async () => {
		const user = await createUser(ours);
		const ticket = await createTicket(ours, { subject: 'Assigned', assigneeId: user.id });

		const response = await admin.fetch(`/api/settings/users/${user.id}`, { method: 'DELETE' });

		expect(response.status).toBe(200);
		expect(await findUser(user.id)).toBeUndefined();
		const [unassigned] = await systemDb
			.select()
			.from(schema.ticket)
			.where(eq(schema.ticket.id, ticket.id));
		expect(unassigned.assigneeId).toBeNull();
	});

	it("doesn't let admins delete themselves", async () => {
		const response = await admin.fetch(`/api/settings/users/${adminUser.id}`, {
			method: 'DELETE'
		});

		expect(response.status).toBe(403);
		expect(await findUser(adminUser.id)).toBeDefined();
	});

	it('cannot reach users of another organization', async () => {
		const theirUser = await createUser(theirs);
		const path = `/api/settings/users/${theirUser.id}`;

		expect((await admin.sendJson('PATCH', path, { banned: true })).status).toBe(404);
		expect((await admin.fetch(path, { method: 'DELETE' })).status).toBe(404);
		expect(await findUser(theirUser.id)).toMatchObject({ banned: false });
	});
});

describe("better-auth's admin endpoints", () => {
	it.each([
		['GET', '/api/auth/admin/list-users'],
		['GET', '/api/auth/admin/get-user?id=1'],
		['POST', '/api/auth/admin/create-user'],
		['POST', '/api/auth/admin/set-role'],
		['POST', '/api/auth/admin/update-user'],
		['POST', '/api/auth/admin/ban-user'],
		['POST', '/api/auth/admin/remove-user'],
		['POST', '/api/auth/admin/set-user-password'],
		['POST', '/api/auth/admin/revoke-user-sessions']
	])('%s %s is closed', async (method, path) => {
		const response =
			method === 'GET' ? await admin.fetch(path) : await admin.sendJson(method, path, {});

		expect(response.status).toBe(403);
	});

	it('impersonates a user of the same organization', async () => {
		const user = await createUser(ours);
		const { browser } = await signIn(ours, 'admin');

		const response = await browser.sendJson('POST', '/api/auth/admin/impersonate-user', {
			userId: user.id
		});

		expect(response.status).toBe(200);
	});

	it('refuses to impersonate a user of another organization', async () => {
		const theirUser = await createUser(theirs);

		const response = await admin.sendJson('POST', '/api/auth/admin/impersonate-user', {
			userId: theirUser.id
		});

		expect(response.status).toBe(403);
	});

	it('refuses an id the endpoint would read differently', async () => {
		const user = await createUser(ours);

		const response = await admin.sendJson('POST', '/api/auth/admin/impersonate-user', {
			userId: `${user.id}.0`
		});

		expect(response.status).toBe(403);
	});
});
