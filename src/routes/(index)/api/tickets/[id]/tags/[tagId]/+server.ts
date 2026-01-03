import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { NotFoundError } from '$lib/server/errors';
import { json } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ params }) => {
	const { id: ticketId } = schema.idParamSchema.parse({ id: params.id });
	const { id: tagId } = schema.idParamSchema.parse({ id: params.tagId });

	const [ticket] = await db.select().from(schema.ticket).where(eq(schema.ticket.id, ticketId));

	if (!ticket) {
		throw new NotFoundError('Ticket not found');
	}

	const deleted = await db
		.delete(schema.ticketTag)
		.where(and(eq(schema.ticketTag.ticketId, ticketId), eq(schema.ticketTag.tagId, tagId)))
		.returning();

	if (deleted.length === 0) {
		throw new NotFoundError('Tag not found on this ticket');
	}

	return json({
		success: true,
		message: 'Tag removed from ticket'
	});
};
