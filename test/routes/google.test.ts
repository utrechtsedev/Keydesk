import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { eq } from 'drizzle-orm';
import nodemailer, { type SendMailOptions } from 'nodemailer';
import { simpleParser } from 'mailparser';
import * as schema from '#lib/server/db/schema/index.js';
import { decrypt } from '#lib/server/db/encrypt.js';
import { Browser, createOrganization, signIn, systemDb, type TestOrganization } from '../app.js';

const google = inject('googleUrl');

let organization: TestOrganization;
let admin: Browser;

beforeAll(async () => {
	organization = await createOrganization('Gmail Org');
	({ browser: admin } = await signIn(organization, 'admin'));
});

afterAll(async () => {
	await systemDb.$client.end();
});

const newAddress = (name: string) => `${name}-${crypto.randomUUID()}@gmail.test`;

async function control(path: string, body: unknown) {
	const response = await fetch(`${google}${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	expect(response.ok).toBe(true);
}

function locationOf(response: Response) {
	const location = response.headers.get('location');
	expect(location).toBeTruthy();
	return location!;
}

/**
 * Connects a mailbox the way an admin's browser does: Keydesk sends them to Google, where they
 * sign in as `account` and allow (or refuse) Keydesk, and back. Returns where Keydesk sends them.
 */
async function connect(address: string, account = address, grant = 'yes') {
	const params = new URLSearchParams({ name: 'Support', address, pollIntervalSeconds: '300' });
	const start = await admin.fetch(`/dashboard/settings/mailboxes/google?${params}`);
	expect(start.status).toBe(303);
	const consent = new URL(locationOf(start));
	expect(consent.searchParams.get('login_hint')).toBe(address);

	consent.searchParams.set('as_account', account);
	consent.searchParams.set('grant', grant);
	const back = await fetch(consent, { redirect: 'manual' });
	return locationOf(await admin.fetch(locationOf(back)));
}

async function mailboxWithAddress(address: string) {
	const [mailbox] = await systemDb
		.select()
		.from(schema.mailbox)
		.where(eq(schema.mailbox.address, address));
	return mailbox;
}

/** A connected mailbox whose first sync has run */
async function connectedMailbox(address: string) {
	await connect(address);
	await expect
		.poll(async () => (await mailboxWithAddress(address))?.cursor, { timeout: 20_000 })
		.toBeTruthy();
	return mailboxWithAddress(address);
}

async function deliver(address: string, message: SendMailOptions) {
	const composer = nodemailer.createTransport({ streamTransport: true, buffer: true });
	const raw = ((await composer.sendMail({ to: address, ...message })).message as Buffer).toString();
	await control('/_test/messages', { address, raw });
	return simpleParser(raw);
}

async function syncNow(id: number) {
	expect((await admin.fetch(`/api/settings/mailboxes/${id}/sync`, { method: 'POST' })).status).toBe(
		202
	);
}

async function ticketWithSubject(subject: string) {
	const [ticket] = await systemDb
		.select()
		.from(schema.ticket)
		.where(eq(schema.ticket.subject, subject));
	return ticket;
}

async function messagesOf(ticketId: number) {
	return systemDb
		.select()
		.from(schema.ticketMessage)
		.where(eq(schema.ticketMessage.ticketId, ticketId))
		.orderBy(schema.ticketMessage.id);
}

describe('connecting a Gmail mailbox', () => {
	it('connects the account that signed in and keeps its refresh token encrypted', async () => {
		const address = newAddress('support');

		const end = await connect(address);

		expect(end).toBe(`/dashboard/settings/mailboxes?connected=${encodeURIComponent(address)}`);
		const mailbox = await mailboxWithAddress(address);
		expect(mailbox).toMatchObject({ organizationId: organization.id, provider: 'google' });
		expect(mailbox.credentials).not.toContain('refresh:');
		expect(JSON.parse(decrypt(mailbox.credentials))).toEqual({
			provider: 'google',
			refreshToken: `refresh:${address}`
		});
	});

	it('refuses another account than the address', async () => {
		const address = newAddress('support');
		const other = newAddress('private');

		const end = await connect(address, other);

		expect(decodeURIComponent(end)).toContain(
			`You signed in to Google as ${other}, not ${address}.`
		);
		expect(await mailboxWithAddress(address)).toBeUndefined();
	});

	it('stops when access is refused', async () => {
		const address = newAddress('support');

		const end = await connect(address, address, 'no');

		expect(decodeURIComponent(end)).toContain('Google: access was not granted.');
		expect(await mailboxWithAddress(address)).toBeUndefined();
	});
});

describe('email through Gmail', () => {
	it('turns an email into a ticket and threads on the Message-ID Gmail gave the reply', async () => {
		const address = newAddress('support');
		const customer = newAddress('customer');
		const subject = `Invoice missing ${crypto.randomUUID()}`;
		const mailbox = await connectedMailbox(address);

		const original = await deliver(address, { from: customer, subject, text: 'Where is it?' });
		await syncNow(mailbox.id);
		await expect.poll(() => ticketWithSubject(subject), { timeout: 20_000 }).toBeDefined();
		const ticket = await ticketWithSubject(subject);

		const form = new FormData();
		form.set('ticketId', String(ticket.id));
		form.set('message', 'It is attached now.');
		form.set('isPrivate', 'false');
		await admin.fetch(`/api/tickets/${ticket.id}/messages`, { method: 'POST', body: form });

		const sentUrl = `${google}/_test/sent?address=${encodeURIComponent(address)}`;
		await expect
			.poll(async () => ((await (await fetch(sentUrl)).json()) as unknown[]).length, {
				timeout: 20_000
			})
			.toBe(1);
		const [sent] = (await (await fetch(sentUrl)).json()) as { raw: string; messageId: string }[];
		const reply = await simpleParser(sent.raw);
		expect(reply.inReplyTo).toBe(original.messageId);
		expect(reply.subject).toBe(`Re: ${subject} [TKT-${ticket.ticketNumber}]`);
		// Gmail's own Message-ID, read back after sending, is the one the customer's answer names
		await expect
			.poll(async () => (await messagesOf(ticket.id))[1]?.emailMessageId, { timeout: 20_000 })
			.toBe(sent.messageId);

		await deliver(address, {
			from: customer,
			subject: 'Got it',
			text: 'Thanks!',
			inReplyTo: sent.messageId
		});
		await syncNow(mailbox.id);
		await expect
			.poll(async () => (await messagesOf(ticket.id)).length, { timeout: 20_000 })
			.toBe(3);
	});

	it('catches up on the mail since the last sync when Gmail forgot the history', async () => {
		const address = newAddress('support');
		const subject = `After a long pause ${crypto.randomUUID()}`;
		const mailbox = await connectedMailbox(address);
		await syncNow(mailbox.id);
		await expect
			.poll(async () => (await mailboxWithAddress(address)).lastSyncedAt, { timeout: 20_000 })
			.toBeTruthy();

		await deliver(address, { from: newAddress('customer'), subject, text: 'Hello?' });
		await control('/_test/forget-history', { address });
		await syncNow(mailbox.id);

		await expect.poll(() => ticketWithSubject(subject), { timeout: 20_000 }).toBeDefined();
	});

	it('asks to connect again when access was withdrawn', async () => {
		const address = newAddress('support');
		const mailbox = await connectedMailbox(address);

		await control('/_test/revoke', { address });
		await syncNow(mailbox.id);

		await expect
			.poll(async () => (await mailboxWithAddress(address)).lastError, { timeout: 20_000 })
			.toContain('connect the mailbox again');
	});
});
