import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const tickets = await schema.validate(schema.ticketConfigSchema)(request);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'tickets',
			value: tickets
		})
		.onConflictDoUpdate({
			target: schema.config.key,
			set: {
				value: tickets,
				updatedAt: new Date()
			}
		})
		.returning();

	await db.execute(
		sql`SELECT setval('ticket_ticket_number_seq', ${tickets.nextTicketNumber}, false)`
	);

	const created = config.createdAt.getTime() === config.updatedAt.getTime();

	return Response.json(
		{
			success: true,
			data: config.value,
			created
		},
		{ status: created ? 201 : 200 }
	);
};

export const GET: RequestHandler = async () => {
	const [config] = await db.select().from(schema.config).where(eq(schema.config.key, 'tickets'));

	if (!config) {
		return Response.json({
			success: true,
			data: null
		});
	}

	return Response.json({
		success: true,
		data: config.value
	});
};
