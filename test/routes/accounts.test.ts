import { afterAll, describe, expect, it } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { Browser } from '../app.js';

afterAll(async () => {
	await db.$client.end();
});

const anonymous = new Browser();
const newEmail = () => `stranger-${crypto.randomUUID()}@keydesk.test`;

async function accountExists(email: string) {
	const users = await db.select().from(schema.user).where(eq(schema.user.email, email));
	return users.length > 0;
}

describe('creating accounts', () => {
	it('has no registration page', async () => {
		const response = await anonymous.fetch('/register', { headers: { accept: 'text/html' } });
		expect(response.status).toBe(404);
	});

	it('refuses to sign up with email and password', async () => {
		const email = newEmail();

		const response = await anonymous.sendJson('POST', '/api/auth/sign-up/email', {
			email,
			password: 'Keydesk-test-123',
			name: 'Stranger'
		});

		expect(response.status).toBe(400);
		expect(await accountExists(email)).toBe(false);
	});

	it('does not create an account from a magic link', async () => {
		const email = newEmail();
		// Mail isn't configured in the tests, so the link isn't sent, but its token is stored first
		await anonymous.sendJson('POST', '/api/auth/sign-in/magic-link', { email });
		const [verification] = await db
			.select()
			.from(schema.verification)
			.where(like(schema.verification.value, `%${email}%`));
		expect(verification).toBeDefined();
		const token = verification.identifier.replace(/^magic-link:/, '');

		const response = await anonymous.fetch(
			`/api/auth/magic-link/verify?token=${token}&callbackURL=/dashboard`
		);

		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toContain('error=new_user_signup_disabled');
		expect(await accountExists(email)).toBe(false);
	});
});
