import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Ticket } from '$lib/types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth-helpers';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { sendNotification } from '$lib/server/job-queue';

export const PATCH: RequestHandler = async ({ request, locals, params }): Promise<Response> => {
	const ticketId = Number(params.id);
	const { user } = requireAuth(locals);

	if (isNaN(ticketId)) throw new ValidationError('Invalid ticket ID');

	// Fetch ticket with related data (priority, status, category)
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

	if (!findTicket) throw new NotFoundError('Ticket not found');

	const { ticket } = (await request.json()) as { ticket: Ticket };

	// Validate required fields
	if (!ticket.requesterId) throw new ValidationError('Requester ID is required');

	if (!ticket.statusId) throw new ValidationError('Status ID is required');

	if (!ticket.priorityId) throw new ValidationError('Priority ID is required');

	// Verify requester exists
	const [requester] = await db
		.select()
		.from(schema.requester)
		.where(eq(schema.requester.id, ticket.requesterId));

	if (!requester) throw new NotFoundError('Requester not found');

	// Verify assignee exists if provided
	if (ticket.assigneeId) {
		const [assignee] = await db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, ticket.assigneeId));

		if (!assignee) throw new NotFoundError('Assigned user not found');
	}

	// Verify status exists
	const [status] = await db
		.select()
		.from(schema.status)
		.where(eq(schema.status.id, ticket.statusId));

	if (!status) throw new NotFoundError('Status not found');

	// Verify priority exists
	const [priority] = await db
		.select()
		.from(schema.priority)
		.where(eq(schema.priority.id, ticket.priorityId));

	if (!priority) throw new NotFoundError('Priority not found');

	// Verify category exists if provided
	if (ticket.categoryId) {
		const [category] = await db
			.select()
			.from(schema.category)
			.where(eq(schema.category.id, ticket.categoryId));

		if (!category) throw new NotFoundError('Category not found');
	}

	// Auto-set resolvedAt/closedAt based on status
	const updateData: Partial<Ticket> = {
		subject: ticket.subject,
		assigneeId: ticket.assigneeId || null,
		statusId: ticket.statusId,
		priorityId: ticket.priorityId,
		categoryId: ticket.categoryId || null,
		requesterId: ticket.requesterId,
		targetDate: ticket.targetDate ? new Date(ticket.targetDate) : new Date()
	};

	// Set resolvedAt if status is resolved
	if (status.isResolved && !findTicket.ticket.resolvedAt) {
		updateData.resolvedAt = new Date();
	} else if (!status.isResolved) {
		updateData.resolvedAt = null;
	}

	// Set closedAt if status is closed
	if (status.isClosed && !findTicket.ticket.closedAt) {
		updateData.closedAt = new Date();
	} else if (!status.isClosed) {
		updateData.closedAt = null;
	}

	// Update the ticket
	await db.update(schema.ticket).set(updateData).where(eq(schema.ticket.id, ticketId));

	// Fetch updated ticket with related data
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

	// Close all related tasks if ticket is closed
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

	// ============================================================================
	// NOTIFICATIONS
	// ============================================================================

	// 1. ASSIGNEE CHANGED - Notify new assignee
	if (
		updatedTicket.ticket.assigneeId &&
		findTicket.ticket.assigneeId !== updatedTicket.ticket.assigneeId &&
		updatedTicket.ticket.assigneeId !== user.id
	) {
		await sendNotification({
			title: 'Ticket assigned to you',
			message: `Ticket assigned by ${user.name}: ${updatedTicket.ticket.subject}`,
			recipient: { userId: updatedTicket.ticket.assigneeId },
			channels: ['dashboard', 'email'],
			notification: {
				type: 'entity',
				event: 'assigned',
				entity: {
					type: 'ticket',
					id: ticketId
				}
			}
		});
	}

	// 2. ASSIGNEE REMOVED - Notify old assignee
	if (
		findTicket.ticket.assigneeId &&
		!updatedTicket.ticket.assigneeId &&
		findTicket.ticket.assigneeId !== user.id
	) {
		await sendNotification({
			title: 'Unassigned from ticket',
			message: `Ticket unassigned by ${user.name}: ${updatedTicket.ticket.subject}`,
			recipient: { userId: findTicket.ticket.assigneeId },
			channels: ['dashboard', 'email'],
			notification: {
				type: 'entity',
				event: 'updated',
				entity: {
					type: 'ticket',
					id: ticketId
				}
			}
		});
	}

	// 3. PRIORITY CHANGED - Notify current assignee
	if (
		updatedTicket.ticket.priorityId !== findTicket.ticket.priorityId &&
		updatedTicket.ticket.assigneeId &&
		updatedTicket.ticket.assigneeId !== user.id
	) {
		await sendNotification({
			title: 'Ticket updated',
			message: `Ticket priority changed from ${findTicket.priority?.name || 'Unknown'} to ${updatedTicket.priority?.name || 'Unknown'} by ${user.name}: ${updatedTicket.ticket.subject}`,
			recipient: { userId: updatedTicket.ticket.assigneeId },
			channels: ['dashboard', 'email'],
			notification: {
				type: 'entity',
				event: 'updated',
				entity: {
					type: 'ticket',
					id: ticketId
				}
			}
		});
	}

	// 4. STATUS CHANGED - Notify assignee
	if (
		updatedTicket.ticket.statusId !== findTicket.ticket.statusId &&
		updatedTicket.ticket.assigneeId &&
		updatedTicket.ticket.assigneeId !== user.id
	) {
		await sendNotification({
			title: 'Ticket updated',
			message: `Ticket status changed from ${findTicket.status?.name || 'Unknown'} to ${updatedTicket.status?.name || 'Unknown'} by ${user.name}: ${updatedTicket.ticket.subject}`,
			recipient: { userId: updatedTicket.ticket.assigneeId },
			channels: ['dashboard', 'email'],
			notification: {
				type: 'entity',
				event: 'updated',
				entity: {
					type: 'ticket',
					id: ticketId
				}
			}
		});
	}

	// 5. CATEGORY CHANGED - Notify assignee
	if (
		updatedTicket.ticket.categoryId !== findTicket.ticket.categoryId &&
		updatedTicket.ticket.assigneeId &&
		updatedTicket.ticket.assigneeId !== user.id
	) {
		await sendNotification({
			title: 'Ticket updated',
			message: `Ticket category changed from ${findTicket.category?.name || 'None'} to ${updatedTicket.category?.name || 'None'} by ${user.name}: ${updatedTicket.ticket.subject}`,
			recipient: { userId: updatedTicket.ticket.assigneeId },
			channels: ['dashboard'],
			notification: {
				type: 'entity',
				event: 'updated',
				entity: {
					type: 'ticket',
					id: ticketId
				}
			}
		});
	}

	// 6. TICKET RESOLVED - Notify assignee
	if (
		updatedTicket.ticket.resolvedAt &&
		!findTicket.ticket.resolvedAt &&
		updatedTicket.ticket.assigneeId &&
		updatedTicket.ticket.assigneeId !== user.id
	) {
		await sendNotification({
			title: 'Ticket resolved',
			message: `Ticket resolved by ${user.name}: ${updatedTicket.ticket.subject}`,
			recipient: { userId: updatedTicket.ticket.assigneeId },
			channels: ['dashboard', 'email'],
			notification: {
				type: 'entity',
				event: 'resolved',
				entity: {
					type: 'ticket',
					id: ticketId
				}
			}
		});
	}

	// 7. STATUS CHANGED TO CLOSED - Notify assignee
	if (
		updatedTicket.ticket.statusId !== findTicket.ticket.statusId &&
		updatedTicket.status?.isClosed &&
		!findTicket.status?.isClosed &&
		updatedTicket.ticket.assigneeId &&
		updatedTicket.ticket.assigneeId !== user.id
	) {
		await sendNotification({
			title: 'Ticket closed',
			message: `Ticket closed by ${user.name}: ${updatedTicket.ticket.subject}`,
			recipient: { userId: updatedTicket.ticket.assigneeId },
			channels: ['dashboard', 'email'],
			notification: {
				type: 'entity',
				event: 'closed',
				entity: {
					type: 'ticket',
					id: ticketId
				}
			}
		});
	}

	return json({
		success: true,
		ticket: updatedTicket.ticket,
		priority: updatedTicket.priority,
		status: updatedTicket.status,
		category: updatedTicket.category
	});
};
