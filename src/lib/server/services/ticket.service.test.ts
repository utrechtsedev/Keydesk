import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '#lib/server/db/schema/index.js';
import {
	createOrganization,
	createTicket,
	inOrganization,
	systemDb
} from '../../../../test/app.js';
import { getTicketPrefix } from './ticket.service.js';

afterAll(async () => {
	await systemDb.$client.end();
});

describe('getTicketPrefix', () => {
	it('reads the prefix from the default configuration', async () => {
		const organization = await createOrganization();

		expect(await inOrganization(organization, getTicketPrefix)).toBe('TKT-');
	});

	it('follows a changed prefix', async () => {
		const organization = await createOrganization();
		await inOrganization(organization, (db) =>
			db
				.update(schema.config)
				.set({ value: { autoCreateRequesters: true, ticketPrefix: 'HD-' } })
				.where(eq(schema.config.key, 'tickets'))
		);

		expect(await inOrganization(organization, getTicketPrefix)).toBe('HD-');
	});
});

describe('allocateTicketNumber', () => {
	it('numbers tickets per organization', async () => {
		const first = await createOrganization();
		const second = await createOrganization();

		const numbers = [
			(await createTicket(first, { subject: 'One' })).ticketNumber,
			(await createTicket(first, { subject: 'Two' })).ticketNumber,
			(await createTicket(second, { subject: 'One' })).ticketNumber
		];

		expect(numbers).toEqual([1, 2, 1]);
	});
});
