import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';
import {
	Browser,
	createOrganization,
	createRequester,
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

/** A few bytes that aren't text, to check they come back unchanged */
const content = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x10, 0x80]);

/** Creates a ticket with one attachment, as the new ticket form does */
async function ticketWithAttachment(fileName: string) {
	const requester = await createRequester(organization);
	const { status, priority } = await defaults(organization);
	const subject = `With attachment ${crypto.randomUUID()}`;

	const form = new FormData();
	form.set('subject', subject);
	form.set('message', '<p>See the scan</p>');
	form.set('isPrivate', 'false');
	form.set('requesterId', String(requester.id));
	form.set('statusId', String(status.id));
	form.set('priorityId', String(priority.id));
	form.set('channel', 'dashboard');
	form.set('targetDate', new Date(Date.now() + 86_400_000).toISOString());
	form.set('tags', '[]');
	form.append('files', new File([content], fileName, { type: 'image/png' }));

	const response = await browser.fetch('/api/tickets', { method: 'POST', body: form });
	expect(response.status).toBe(201);

	const [ticket] = await systemDb
		.select()
		.from(schema.ticket)
		.where(eq(schema.ticket.subject, subject));
	const [attachment] = await systemDb
		.select()
		.from(schema.ticketAttachment)
		.where(eq(schema.ticketAttachment.ticketId, ticket.id));
	return { ticket, attachment };
}

describe('attachments', () => {
	it('stores an uploaded file under its organization', async () => {
		const { attachment } = await ticketWithAttachment('scan.png');

		expect(attachment).toMatchObject({
			originalFileName: 'scan.png',
			mimeType: 'image/png',
			fileSize: content.length
		});
		expect(attachment.storageKey).toBe(
			`organizations/${organization.id}/attachments/${attachment.fileName}`
		);
	});

	it('serves the file to the organization', async () => {
		const { ticket, attachment } = await ticketWithAttachment('scan van €5.png');

		const response = await browser.fetch(`/api/tickets/${ticket.id}/${attachment.fileName}`);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');
		expect(response.headers.get('content-disposition')).toBe(
			`attachment; filename*=UTF-8''${encodeURIComponent('scan van €5.png')}`
		);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(content);
	});

	it("doesn't serve it to another organization", async () => {
		const { ticket, attachment } = await ticketWithAttachment('scan.png');
		const { browser: outsider } = await signIn(await createOrganization(), 'admin');

		const response = await outsider.fetch(`/api/tickets/${ticket.id}/${attachment.fileName}`);

		expect(response.status).toBe(404);
	});
});
