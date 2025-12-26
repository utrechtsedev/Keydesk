import { requireAuth } from '$lib/server/auth-helpers';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { uploadFile } from '$lib/server/file-upload';
import { generateTicketNumber } from '$lib/server/ticket';
import type { Attachment, Ticket } from '$lib/types';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { user } = requireAuth(locals);

	const formData = await request.formData();
	const subject = formData.get('subject') as string;
	const message = formData.get('message') as string;
	const isPrivate = formData.get('isPrivate') as string;
	const requesterId = formData.get('requesterId') as string;
	const assigneeId = formData.get('assigneeId') as string;
	const categoryId = formData.get('categoryId') as string;
	const priorityId = formData.get('priorityId') as string;
	const statusId = formData.get('statusId') as string;
	const channel = (formData.get('channel') as string) || 'portal';
	const targetDate = formData.get('targetDate') as string;
	const files = formData.getAll('files').filter((file): file is File => file instanceof File);

	const result = await db.transaction(async (tx) => {
		// Validation
		if (!subject || subject.trim() === '') throw new ValidationError('Subject is required.');

		if (!message || message.trim() === '') throw new ValidationError('Message is required.');

		if (!requesterId || isNaN(Number(requesterId)))
			throw new ValidationError('Valid requester ID is required.');

		if (!categoryId || isNaN(Number(categoryId)))
			throw new ValidationError('Valid category ID is required.');

		if (!priorityId || isNaN(Number(priorityId)))
			throw new ValidationError('Valid priority ID is required.');

		if (!statusId || isNaN(Number(statusId)))
			throw new ValidationError('Valid status ID is required.');

		if (!targetDate) throw new ValidationError('Target date is required.');

		const isPrivateValue = JSON.parse(isPrivate);

		if (typeof isPrivateValue !== 'boolean')
			throw new ValidationError('Invalid privacy setting format.');

		const [attachmentOptions] = await tx
			.select()
			.from(schema.config)
			.where(eq(schema.config.key, 'attachments'));

		if (!attachmentOptions)
			throw new NotFoundError(
				'Attachment configuration not found. Please configure attachments in Settings.'
			);

		const attachmentConfig = attachmentOptions.value as Attachment;

		if (!attachmentConfig) throw new ValidationError('Invalid attachment configuration.');

		const ticketNumber = await generateTicketNumber(tx);

		const [newTicket] = await tx
			.insert(schema.ticket)
			.values({
				ticketNumber,
				requesterId: Number(requesterId),
				assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
				subject,
				channel: channel as 'email' | 'portal' | 'user',
				statusId: Number(statusId),
				priorityId: Number(priorityId),
				categoryId: Number(categoryId),
				targetDate: new Date(targetDate),
				responseCount: 0,
				firstResponseAt: null,
				resolvedAt: null,
				closedAt: null,
				lastUserResponseAt: null,
				lastRequesterResponseAt: null
			})
			.returning();

		const [ticketMessage] = await tx
			.insert(schema.ticketMessage)
			.values({
				ticketId: newTicket.id,
				senderType: 'user',
				requesterId: null,
				senderName: user.name,
				senderEmail: user.email,
				userId: user.id,
				message,
				isPrivate: isPrivateValue,
				channel: 'dashboard',
				isFirstResponse: false,
				hasAttachments: files.length > 0
			})
			.returning();

		for (const file of files) {
			const fileUpload = await uploadFile(file, attachmentConfig);

			await tx.insert(schema.ticketAttachment).values({
				ticketId: newTicket.id,
				messageId: ticketMessage.id,
				fileName: fileUpload.storedFilename,
				originalFileName: fileUpload.originalFilename,
				filePath: fileUpload.filePath,
				fileSize: fileUpload.size,
				mimeType: fileUpload.mimeType,
				uploadedByType: 'user',
				uploadedById: user.id,
				uploadedByName: user.name,
				downloadCount: 0
			});
		}

		return {
			ticketId: newTicket.id,
			ticketNumber: newTicket.ticketNumber,
			messageId: ticketMessage.id
		};
	});

	return json(
		{
			success: true,
			data: result,
			message: 'Ticket created successfully.'
		},
		{ status: 201 }
	);
};

export const PATCH: RequestHandler = async ({ request }): Promise<Response> => {
	const { ids, ticket } = (await request.json()) as {
		ids: number[];
		ticket: Partial<Ticket>;
	};

	if (!ids || !Array.isArray(ids) || ids.length < 1)
		throw new ValidationError('Ticket IDs are required');

	if (!ticket || Object.keys(ticket).length === 0)
		throw new ValidationError('Update data is required');

	const findTickets = await db.select().from(schema.ticket).where(inArray(schema.ticket.id, ids));

	if (findTickets.length === 0) throw new NotFoundError('No tickets found with provided IDs');

	if (ticket.statusId) {
		const [status] = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.id, ticket.statusId));

		if (!status) throw new NotFoundError('Status not found');
	}

	if (ticket.priorityId) {
		const [priority] = await db
			.select()
			.from(schema.priority)
			.where(eq(schema.priority.id, ticket.priorityId));

		if (!priority) throw new NotFoundError('Priority not found');
	}

	if (ticket.categoryId) {
		const [category] = await db
			.select()
			.from(schema.category)
			.where(eq(schema.category.id, ticket.categoryId));

		if (!category) throw new NotFoundError('Category not found');
	}

	if (ticket.assigneeId) {
		const [assignee] = await db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, ticket.assigneeId));

		if (!assignee) throw new NotFoundError('Assigned user not found');
	}

	if (ticket.requesterId) {
		const [requester] = await db
			.select()
			.from(schema.requester)
			.where(eq(schema.requester.id, ticket.requesterId));

		if (!requester) throw new NotFoundError('Requester not found');
	}

	// Build update data
	const updateData: Partial<Ticket> = {};

	// Only include fields that were provided
	if (ticket.subject !== undefined) updateData.subject = ticket.subject;
	if (ticket.assigneeId !== undefined) updateData.assigneeId = ticket.assigneeId;
	if (ticket.statusId !== undefined) updateData.statusId = ticket.statusId;
	if (ticket.priorityId !== undefined) updateData.priorityId = ticket.priorityId;
	if (ticket.categoryId !== undefined) updateData.categoryId = ticket.categoryId;
	if (ticket.requesterId !== undefined) updateData.requesterId = ticket.requesterId;
	if (ticket.targetDate !== undefined) {
		updateData.targetDate = ticket.targetDate ? new Date(ticket.targetDate) : new Date();
	}

	// Handle status-based automatic timestamps
	if (ticket.statusId) {
		const [status] = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.id, ticket.statusId));

		if (status) {
			// Set resolvedAt if status is resolved
			if (status.isResolved) {
				updateData.resolvedAt = new Date();
			} else {
				updateData.resolvedAt = null;
			}

			// Set closedAt if status is closed
			if (status.isClosed) {
				updateData.closedAt = new Date();
			} else {
				updateData.closedAt = null;
			}
		}
	}

	// Perform bulk update
	await db.update(schema.ticket).set(updateData).where(inArray(schema.ticket.id, ids));

	// If tickets are being closed, close related tasks
	if (ticket.statusId) {
		const [status] = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.id, ticket.statusId));

		if (status?.isClosed) {
			const closedTaskStatus = await db
				.select()
				.from(schema.status)
				.where(eq(schema.status.isClosed, true));

			if (closedTaskStatus.length > 0) {
				await db
					.update(schema.task)
					.set({ statusId: closedTaskStatus[0].id })
					.where(inArray(schema.task.ticketId, ids));
			}
		}
	}

	return json(
		{
			success: true,
			updated: findTickets.length,
			ticketIds: ids
		},
		{ status: 200 }
	);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { ids } = (await request.json()) as { ids: number[] };

	if (!ids || !Array.isArray(ids) || ids.length < 1)
		throw new ValidationError('Some fields are missing. Please retry your request.');

	const deleted = await db.delete(schema.ticket).where(inArray(schema.ticket.id, ids)).returning();

	if (!deleted || deleted.length === 0) throw new NotFoundError('No tickets were found.');

	return json(
		{
			success: true,
			deleted: deleted.length
		},
		{ status: 200 }
	);
};
