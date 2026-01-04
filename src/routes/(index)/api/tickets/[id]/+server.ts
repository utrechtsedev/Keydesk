import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Ticket } from '$lib/types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '$lib/server/errors';

export const PATCH: RequestHandler = async ({ request, params }): Promise<Response> => {
	const ticketId = schema.idParamSchema.parse(params.id);

	const [findTicket] = await db
		.select({
			ticket: schema.ticket,
			priority: schema.priority,
			status: schema.status,
			category: schema.category
		})
		.from(schema.ticket)
		.leftJoin(schema.priority, eq(schema.ticket.priorityId, schema.priority.id))
		.leftJoin(schema.status, eq(schema.ticket.statusId, schema.status.id))
		.leftJoin(schema.category, eq(schema.ticket.categoryId, schema.category.id))
		.where(eq(schema.ticket.id, ticketId));

	if (!findTicket) {
		throw new NotFoundError('Ticket not found');
	}

	const ticket = await schema.validate(schema.updateTicketSchema)(request);

	if (ticket.requesterId) {
		const [requester] = await db
			.select()
			.from(schema.requester)
			.where(eq(schema.requester.id, ticket.requesterId));

		if (!requester) {
			throw new NotFoundError('Requester not found');
		}
	}

	if (ticket.assigneeId) {
		const [assignee] = await db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, ticket.assigneeId));

		if (!assignee) {
			throw new NotFoundError('Assigned user not found');
		}
	}

	let status = null;
	if (ticket.statusId) {
		[status] = await db.select().from(schema.status).where(eq(schema.status.id, ticket.statusId));

		if (!status) {
			throw new NotFoundError('Status not found');
		}
	}

	if (ticket.priorityId) {
		const [priority] = await db
			.select()
			.from(schema.priority)
			.where(eq(schema.priority.id, ticket.priorityId));

		if (!priority) {
			throw new NotFoundError('Priority not found');
		}
	}

	if (ticket.categoryId) {
		const [category] = await db
			.select()
			.from(schema.category)
			.where(eq(schema.category.id, ticket.categoryId));

		if (!category) {
			throw new NotFoundError('Category not found');
		}
	}

	const updateData: Partial<Ticket> = {};

	if (ticket.subject !== undefined) updateData.subject = ticket.subject;
	if (ticket.assigneeId !== undefined) updateData.assigneeId = ticket.assigneeId;
	if (ticket.statusId !== undefined) updateData.statusId = ticket.statusId;
	if (ticket.priorityId !== undefined) updateData.priorityId = ticket.priorityId;
	if (ticket.categoryId !== undefined) updateData.categoryId = ticket.categoryId;
	if (ticket.requesterId !== undefined) updateData.requesterId = ticket.requesterId;
	if (ticket.targetDate !== undefined) updateData.targetDate = ticket.targetDate;

	if (status) {
		if (status.isResolved && !findTicket.ticket.resolvedAt) {
			updateData.resolvedAt = new Date();
		} else if (!status.isResolved) {
			updateData.resolvedAt = null;
		}

		if (status.isClosed && !findTicket.ticket.closedAt) {
			updateData.closedAt = new Date();
		} else if (!status.isClosed) {
			updateData.closedAt = null;
		}
	}

	await db.update(schema.ticket).set(updateData).where(eq(schema.ticket.id, ticketId));

	const [updatedTicket] = await db
		.select({
			ticket: schema.ticket,
			priority: schema.priority,
			status: schema.status,
			category: schema.category
		})
		.from(schema.ticket)
		.leftJoin(schema.priority, eq(schema.ticket.priorityId, schema.priority.id))
		.leftJoin(schema.status, eq(schema.ticket.statusId, schema.status.id))
		.leftJoin(schema.category, eq(schema.ticket.categoryId, schema.category.id))
		.where(eq(schema.ticket.id, ticketId));

	if (updatedTicket.status?.isClosed) {
		const closedStatus = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.isClosed, true));

		if (closedStatus.length > 0) {
			await db
				.update(schema.task)
				.set({ statusId: closedStatus[0].id })
				.where(eq(schema.task.ticketId, ticketId));
		}
	}

	return json({
		success: true,
		ticket: updatedTicket.ticket,
		priority: updatedTicket.priority,
		status: updatedTicket.status,
		category: updatedTicket.category
	});
};
