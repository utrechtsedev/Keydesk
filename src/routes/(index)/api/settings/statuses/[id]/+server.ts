import type { RequestHandler } from './$types';
import * as schema from '$lib/server/db/schema';
import { db } from '$lib/server/db/database';
import { eq, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { ConflictError, NotFoundError } from '$lib/server/errors';

export const DELETE: RequestHandler = async ({ params }): Promise<Response> => {
	const id = schema.idParamSchema.parse(params.id);

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
	const id = schema.idParamSchema.parse(params.id);
	const status = await schema.validate(schema.updateStatusSchema)(request);

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
