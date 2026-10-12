import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import nodemailer, { type SendMailOptions } from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import * as schema from '#lib/server/db/schema/index.js';
import { decrypt } from '#lib/server/db/encrypt.js';
import { Browser, createOrganization, signIn, systemDb, type TestOrganization } from '../app.js';

let organization: TestOrganization;
let browser: Browser;

beforeAll(async () => {
	organization = await createOrganization('Mailbox Org');
	({ browser } = await signIn(organization, 'admin'));
});

afterAll(async () => {
	await systemDb.$client.end();
});

const mailHost = process.env.MAIL_HOST!;
const smtpPort = Number(process.env.SMTP_PORT);
const imapPort = Number(process.env.IMAP_PORT);
const newAddress = (name: string) => `${name}-${crypto.randomUUID()}@keydesk.test`;

/** The compose mail server accepts any password; GreenMail creates the account on first use */
function server(port: number, username: string, password = 'mail-secret') {
	return { host: mailHost, port, secure: false, username, password };
}

function mailboxInput(address: string, values: Record<string, unknown> = {}) {
	return {
		name: 'Support',
		address,
		provider: 'imap',
		imap: server(imapPort, address),
		smtp: server(smtpPort, address),
		pollIntervalSeconds: 300,
		enabled: true,
		...values
	};
}

async function addMailbox(address: string) {
	const response = await browser.sendJson('POST', '/api/settings/mailboxes', mailboxInput(address));
	expect(response.status).toBe(201);
	const { data } = (await response.json()) as { data: { id: number } };
	return data.id;
}

async function storedMailbox(id: number) {
	const [mailbox] = await systemDb.select().from(schema.mailbox).where(eq(schema.mailbox.id, id));
	return mailbox;
}

/** A mailbox whose first sync has run: from then on, new mail becomes tickets */
async function syncedMailbox(address: string) {
	const id = await addMailbox(address);
	await expect
		.poll(async () => (await storedMailbox(id)).cursor, { timeout: 20_000 })
		.not.toBeNull();
	return id;
}

async function syncNow(id: number) {
	const response = await browser.fetch(`/api/settings/mailboxes/${id}/sync`, { method: 'POST' });
	expect(response.status).toBe(202);
}

/** Sends an email the way a customer's mail program does */
async function sendAsCustomer(message: SendMailOptions) {
	const transport = nodemailer.createTransport({ host: mailHost, port: smtpPort, secure: false });
	try {
		return await transport.sendMail(message);
	} finally {
		transport.close();
	}
}

/** The messages in an address's inbox on the mail server */
async function inbox(address: string): Promise<ParsedMail[]> {
	const imap = new ImapFlow({
		host: mailHost,
		port: imapPort,
		secure: false,
		auth: { user: address, pass: 'mail-secret' },
		logger: false
	});
	await imap.connect();
	try {
		const opened = await imap.mailboxOpen('INBOX');
		if (opened.exists === 0) return [];
		const messages: ParsedMail[] = [];
		for await (const message of imap.fetch('1:*', { source: true })) {
			messages.push(await simpleParser(message.source!));
		}
		return messages;
	} finally {
		await imap.logout();
	}
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

function reply(ticketId: number, message: string, isPrivate = false) {
	const form = new FormData();
	form.set('ticketId', String(ticketId));
	form.set('message', message);
	form.set('isPrivate', String(isPrivate));
	return browser.fetch(`/api/tickets/${ticketId}/messages`, { method: 'POST', body: form });
}

describe('managing mailboxes', () => {
	it('stores the passwords encrypted and never shows them', async () => {
		const address = newAddress('support');

		const response = await browser.sendJson(
			'POST',
			'/api/settings/mailboxes',
			mailboxInput(address, { imap: server(imapPort, address, 'imap-password-123') })
		);

		expect(response.status).toBe(201);
		const body = await response.text();
		expect(body).not.toContain('imap-password-123');
		expect(body).toContain('"hasPassword":true');
		const { data } = JSON.parse(body) as { data: { id: number } };
		const stored = await storedMailbox(data.id);
		expect(stored.credentials).not.toContain('imap-password-123');
		expect(JSON.parse(decrypt(stored.credentials)).imap.password).toBe('imap-password-123');
	});

	it('keeps a password left empty when editing', async () => {
		const address = newAddress('support');
		const id = await addMailbox(address);

		const response = await browser.sendJson(
			'PATCH',
			`/api/settings/mailboxes/${id}`,
			mailboxInput(address, { name: 'Helpdesk', imap: server(imapPort, address, '') })
		);

		expect(response.status).toBe(200);
		const stored = await storedMailbox(id);
		expect(stored.name).toBe('Helpdesk');
		expect(JSON.parse(decrypt(stored.credentials)).imap.password).toBe('mail-secret');
	});

	it('refuses a second mailbox with the same address', async () => {
		const address = newAddress('support');
		await addMailbox(address);

		const response = await browser.sendJson(
			'POST',
			'/api/settings/mailboxes',
			mailboxInput(address)
		);

		expect(response.status).toBe(409);
	});

	it("can't reach another organization's mailboxes", async () => {
		const id = await addMailbox(newAddress('support'));
		const { browser: outsider } = await signIn(await createOrganization(), 'admin');

		const list = (await (await outsider.fetch('/api/settings/mailboxes')).json()) as {
			data: unknown[];
		};
		expect(list.data).toEqual([]);
		expect(
			(
				await outsider.sendJson(
					'PATCH',
					`/api/settings/mailboxes/${id}`,
					mailboxInput(newAddress('x'))
				)
			).status
		).toBe(404);
		expect(
			(await outsider.fetch(`/api/settings/mailboxes/${id}`, { method: 'DELETE' })).status
		).toBe(404);
		expect(await storedMailbox(id)).toBeDefined();
	});

	it('tests the connection to the mail servers', async () => {
		const address = newAddress('support');

		const working = await browser.sendJson(
			'POST',
			'/api/settings/mailboxes/test',
			mailboxInput(address)
		);
		const broken = await browser.sendJson(
			'POST',
			'/api/settings/mailboxes/test',
			mailboxInput(address, { imap: server(1, address) })
		);

		expect(await working.json()).toMatchObject({
			success: true,
			imap: { ok: true },
			smtp: { ok: true }
		});
		expect(await broken.json()).toMatchObject({
			success: false,
			imap: { ok: false },
			smtp: { ok: true }
		});
	});
});

describe('email in and out', () => {
	it('turns an email into a ticket, emails the reply and adds the answer to the ticket', async () => {
		const support = newAddress('support');
		const customer = newAddress('customer');
		const subject = `Printer on fire ${crypto.randomUUID()}`;
		const mailboxId = await syncedMailbox(support);

		// The customer writes in
		const sent = await sendAsCustomer({
			from: `Carla Klant <${customer}>`,
			to: support,
			subject,
			text: 'It smells of smoke.\nPlease help.'
		});
		await syncNow(mailboxId);
		await expect.poll(() => ticketWithSubject(subject), { timeout: 20_000 }).toBeDefined();
		const ticket = await ticketWithSubject(subject);
		expect(ticket).toMatchObject({ channel: 'email', mailboxId });
		const [first] = await messagesOf(ticket.id);
		expect(first).toMatchObject({
			senderType: 'requester',
			senderEmail: customer,
			message: 'It smells of smoke.<br>Please help.',
			emailMessageId: sent.messageId
		});

		// An internal note stays in Keydesk; the reply goes to the customer
		expect((await reply(ticket.id, 'Internal: check the warranty', true)).status).toBe(201);
		expect((await reply(ticket.id, 'Unplug it & step away.')).status).toBe(201);
		await expect.poll(async () => (await inbox(customer)).length, { timeout: 20_000 }).toBe(1);
		const [answer] = await inbox(customer);
		expect(answer.from?.value[0].address).toBe(support);
		expect(answer.subject).toBe(`Re: ${subject} [TKT-${ticket.ticketNumber}]`);
		expect(answer.inReplyTo).toBe(sent.messageId);
		expect(answer.text).toContain('Unplug it & step away.');
		const [, note, sentReply] = await messagesOf(ticket.id);
		expect(note.emailMessageId).toBeNull();
		expect(sentReply.emailMessageId).toBe(answer.messageId);

		// The customer answers the reply; their mail program keeps the thread, not the subject
		await sendAsCustomer({
			from: customer,
			to: support,
			subject: 'Thanks!',
			text: 'Done, all quiet now.',
			inReplyTo: answer.messageId,
			references: [sent.messageId!, answer.messageId!]
		});
		await syncNow(mailboxId);
		await expect
			.poll(async () => (await messagesOf(ticket.id)).length, { timeout: 20_000 })
			.toBe(4);
		expect((await messagesOf(ticket.id))[3]).toMatchObject({
			senderType: 'requester',
			message: 'Done, all quiet now.'
		});

		// Syncing again finds nothing new
		await syncNow(mailboxId);
		await new Promise((resolve) => setTimeout(resolve, 2000));
		expect(await messagesOf(ticket.id)).toHaveLength(4);
	});

	it('finds the ticket by the number in the subject', async () => {
		const support = newAddress('support');
		const customer = newAddress('customer');
		const subject = `Lost password ${crypto.randomUUID()}`;
		const mailboxId = await syncedMailbox(support);
		await sendAsCustomer({ from: customer, to: support, subject, text: 'First' });
		await syncNow(mailboxId);
		await expect.poll(() => ticketWithSubject(subject), { timeout: 20_000 }).toBeDefined();
		const ticket = await ticketWithSubject(subject);

		await sendAsCustomer({
			from: customer,
			to: support,
			subject: `Fwd: about TKT-${ticket.ticketNumber}`,
			text: 'Second'
		});
		await syncNow(mailboxId);

		await expect
			.poll(async () => (await messagesOf(ticket.id)).length, { timeout: 20_000 })
			.toBe(2);
	});

	it('keeps the attachments of an email', async () => {
		const support = newAddress('support');
		const subject = `Screenshot ${crypto.randomUUID()}`;
		const mailboxId = await syncedMailbox(support);

		await sendAsCustomer({
			from: newAddress('customer'),
			to: support,
			subject,
			text: 'See attached',
			attachments: [
				{
					filename: 'error.png',
					content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
					contentType: 'image/png'
				}
			]
		});
		await syncNow(mailboxId);
		await expect.poll(() => ticketWithSubject(subject), { timeout: 20_000 }).toBeDefined();

		const ticket = await ticketWithSubject(subject);
		const [attachment] = await systemDb
			.select()
			.from(schema.ticketAttachment)
			.where(eq(schema.ticketAttachment.ticketId, ticket.id));
		expect(attachment).toMatchObject({
			originalFileName: 'error.png',
			uploadedByType: 'requester'
		});
		expect(attachment.storageKey).toMatch(
			new RegExp(`^organizations/${organization.id}/attachments/`)
		);
	});

	it('leaves automatic replies out of tickets', async () => {
		const support = newAddress('support');
		const customer = newAddress('customer');
		const subject = `Out of office ${crypto.randomUUID()}`;
		const mailboxId = await syncedMailbox(support);

		await sendAsCustomer({
			from: customer,
			to: support,
			subject,
			text: 'I am away until Monday',
			headers: { 'Auto-Submitted': 'auto-replied' }
		});
		await syncNow(mailboxId);

		await expect
			.poll(
				async () => {
					const [archived] = await systemDb
						.select()
						.from(schema.email)
						.where(and(eq(schema.email.mailboxId, mailboxId), eq(schema.email.subject, subject)));
					return archived?.processingError;
				},
				{ timeout: 20_000 }
			)
			.toContain('Automatic');
		expect(await ticketWithSubject(subject)).toBeUndefined();
	});
});
