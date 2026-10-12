import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import * as schema from '#lib/server/db/schema/index.js';
import { decrypt } from '#lib/server/db/encrypt.js';
import { Browser, createOrganization, signIn, systemDb, type TestOrganization } from '../app.js';

const microsoft = inject('microsoftUrl');

let organization: TestOrganization;
let admin: Browser;

beforeAll(async () => {
	organization = await createOrganization('Microsoft Org');
	({ browser: admin } = await signIn(organization, 'admin'));
});

afterAll(async () => {
	await systemDb.$client.end();
});

const unique = (name: string) => `${name}-${crypto.randomUUID()}`;

async function control(path: string, body: unknown) {
	const response = await fetch(`${microsoft}${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	expect(response.ok).toBe(true);
}

/** A Microsoft 365 organization with the given mailboxes */
async function tenant(addresses: string[], consent = false) {
	const tenantId = unique('tenant');
	await control('/_test/tenants', { tenantId, addresses, consent });
	return tenantId;
}

function locationOf(response: Response) {
	const location = response.headers.get('location');
	expect(location).toBeTruthy();
	return location!;
}

/** At Microsoft, outside Keydesk: follows one redirect step without cookies */
async function atMicrosoft(url: string, extra: Record<string, string>) {
	const step = new URL(url);
	for (const [name, value] of Object.entries(extra)) step.searchParams.set(name, value);
	const response = await fetch(step, { redirect: 'manual' });
	expect(response.status).toBe(302);
	return locationOf(response);
}

/**
 * Connects a mailbox the way an admin's browser does: Keydesk sends them to sign in at Microsoft
 * as an account of `signInTenant`, back to Keydesk, on to the admin consent and back again.
 * Returns where Keydesk sends them in the end.
 */
async function connect(
	browser: Browser,
	address: string,
	signInTenant: string,
	consent: Record<string, string> = { grant: 'yes' }
) {
	const params = new URLSearchParams({ name: 'Support', address, pollIntervalSeconds: '300' });
	const start = await browser.fetch(`/dashboard/settings/mailboxes/microsoft?${params}`);
	expect(start.status).toBe(303);

	const signedIn = await atMicrosoft(locationOf(start), { as_tenant: signInTenant });
	const afterSignIn = await browser.fetch(signedIn);
	expect(afterSignIn.status).toBe(303);
	const consentUrl = locationOf(afterSignIn);
	if (!consentUrl.startsWith(microsoft)) return consentUrl;

	const granted = await atMicrosoft(consentUrl, consent);
	return locationOf(await browser.fetch(granted));
}

async function mailboxWithAddress(address: string) {
	const [mailbox] = await systemDb
		.select()
		.from(schema.mailbox)
		.where(eq(schema.mailbox.address, address));
	return mailbox;
}

describe('connecting a Microsoft 365 mailbox', () => {
	it('connects an address in the tenant of the admin who signed in', async () => {
		const address = `${unique('support')}@contoso.test`;
		const tenantId = await tenant([address]);

		const end = await connect(admin, address, tenantId);

		expect(end).toBe(`/dashboard/settings/mailboxes?connected=${encodeURIComponent(address)}`);
		const mailbox = await mailboxWithAddress(address);
		expect(mailbox).toMatchObject({ organizationId: organization.id, provider: 'microsoft' });
		expect(JSON.parse(decrypt(mailbox.credentials))).toEqual({ provider: 'microsoft', tenantId });
	});

	it('refuses an address outside that tenant', async () => {
		const address = `${unique('support')}@fabrikam.test`;
		await tenant([address]);
		const ownTenant = await tenant([`${unique('someone')}@contoso.test`]);

		const end = await connect(admin, address, ownTenant);

		expect(decodeURIComponent(end)).toContain(`Keydesk can't read ${address}`);
		expect(await mailboxWithAddress(address)).toBeUndefined();
	});

	it('ignores a tenant changed on the way back from the consent', async () => {
		// Another Keydesk customer's tenant, which granted Keydesk access before
		const victim = `${unique('ceo')}@victim.test`;
		const victimTenant = await tenant([victim], true);
		const attackerTenant = await tenant([`${unique('attacker')}@attacker.test`]);

		const end = await connect(admin, victim, attackerTenant, {
			grant: 'yes',
			override_tenant: victimTenant
		});

		expect(decodeURIComponent(end)).toContain(`Keydesk can't read ${victim}`);
		expect(await mailboxWithAddress(victim)).toBeUndefined();
	});

	it('stops when the admin declines', async () => {
		const address = `${unique('support')}@contoso.test`;
		const tenantId = await tenant([address]);

		const end = await connect(admin, address, tenantId, { grant: 'no' });

		expect(decodeURIComponent(end)).toContain('The admin declined.');
		expect(await mailboxWithAddress(address)).toBeUndefined();
	});

	it('refuses a connection another admin started', async () => {
		const address = `${unique('support')}@contoso.test`;
		const tenantId = await tenant([address]);
		const params = new URLSearchParams({ name: 'Support', address });
		const start = await admin.fetch(`/dashboard/settings/mailboxes/microsoft?${params}`);
		const signedIn = await atMicrosoft(locationOf(start), { as_tenant: tenantId });
		const { browser: someoneElse } = await signIn(organization, 'admin');

		const response = await someoneElse.fetch(signedIn);

		expect(decodeURIComponent(locationOf(response))).toContain('started elsewhere');
	});
});

describe('email through Microsoft 365', () => {
	it('turns an email into a ticket and sends the reply through Graph', async () => {
		const address = `${unique('support')}@contoso.test`;
		const customer = `${unique('customer')}@example.com`;
		const subject = `Laptop won't start ${crypto.randomUUID()}`;
		const tenantId = await tenant([address]);
		await connect(admin, address, tenantId);
		const mailbox = await mailboxWithAddress(address);
		await expect
			.poll(async () => (await mailboxWithAddress(address)).cursor, { timeout: 20_000 })
			.not.toBeNull();

		// A customer's email arrives in the Microsoft 365 inbox
		const composer = nodemailer.createTransport({ streamTransport: true, buffer: true });
		const { message } = await composer.sendMail({
			from: customer,
			to: address,
			subject,
			text: 'The screen stays black.',
			messageId: `<${crypto.randomUUID()}@example.com>`
		});
		const raw = (message as Buffer).toString();
		const original = await simpleParser(raw);
		await control('/_test/messages', { address, raw });
		const sync = await admin.fetch(`/api/settings/mailboxes/${mailbox.id}/sync`, {
			method: 'POST'
		});
		expect(sync.status).toBe(202);

		await expect
			.poll(
				async () =>
					(
						await systemDb.select().from(schema.ticket).where(eq(schema.ticket.subject, subject))
					)[0],
				{ timeout: 20_000 }
			)
			.toBeDefined();
		const [ticket] = await systemDb
			.select()
			.from(schema.ticket)
			.where(eq(schema.ticket.subject, subject));
		expect(ticket.mailboxId).toBe(mailbox.id);

		// The agent replies
		const form = new FormData();
		form.set('ticketId', String(ticket.id));
		form.set('message', 'Hold the power button for 10 seconds.');
		form.set('isPrivate', 'false');
		expect(
			(await admin.fetch(`/api/tickets/${ticket.id}/messages`, { method: 'POST', body: form }))
				.status
		).toBe(201);

		await expect
			.poll(
				async () =>
					(
						(await (
							await fetch(`${microsoft}/_test/sent?address=${encodeURIComponent(address)}`)
						).json()) as unknown[]
					).length,
				{ timeout: 20_000 }
			)
			.toBe(1);
		const [sent] = (await (
			await fetch(`${microsoft}/_test/sent?address=${encodeURIComponent(address)}`)
		).json()) as { mime: string }[];
		const reply = await simpleParser(sent.mime);
		expect(reply.to).toMatchObject({ value: [{ address: customer }] });
		expect(reply.subject).toBe(`Re: ${subject} [TKT-${ticket.ticketNumber}]`);
		expect(reply.inReplyTo).toBe(original.messageId);
		expect(reply.text).toContain('Hold the power button for 10 seconds.');
	});
});
