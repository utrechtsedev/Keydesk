import type { RequestHandler } from './$types';
import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';
import { eq, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { ConflictError, NotFoundError, ValidationError } from '$lib/server/errors';
import type { Status } from '$lib/types';

export const DELETE: RequestHandler = async ({ params }): Promise<Response> => {
	const id = Number(params.id);

	if (!id) throw new ValidationError('Status ID is required.');

	const [status] = await db.select().from(schema.status).where(eq(schema.status.id, id));

	if (!status) throw new NotFoundError('Status not found.');

	// Prevent deletion of ANY system status
	if (status.isDefault || status.isResolved || status.isClosed)
		throw new ConflictError('Cannot delete system statuses (Default, Resolved, or Closed).');

	// Check for associated tickets
	const [ticketCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.ticket)
		.where(eq(schema.ticket.statusId, id));

	if (Number(ticketCount.count) > 0)
		throw new ConflictError('Cannot delete status with associated tickets.');

	await db.delete(schema.status).where(eq(schema.status.id, id));

	return json({
		success: true,
		message: 'Status deleted successfully.'
	});
};

export const PATCH: RequestHandler = async ({ request, params }): Promise<Response> => {
	const id = Number(params.id);
	const { status } = (await request.json()) as { status: Status };

	if (id !== status.id) throw new ValidationError('Incorrect status ID.');

	const [updatedStatus] = await db
		.update(schema.status)
		.set({
			name: status.name,
			color: status.color,
			updatedAt: new Date()
		})
		.where(eq(schema.status.id, id))
		.returning();

	if (!updatedStatus) {
		throw new NotFoundError('Status not found.');
	}

	return json({
		success: true,
		message: 'Status updated successfully.',
		data: updatedStatus
	});
};
