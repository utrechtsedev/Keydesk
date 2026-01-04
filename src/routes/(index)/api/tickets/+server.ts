import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { uploadFile } from '$lib/server/file-upload';
import type { Attachment, Ticket } from '$lib/types';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { sendNotification } from '$lib/server/queue';
import z from 'zod';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { user } = requireAuth(locals);

	const formData = schema.parseFormData(await request.formData());

	const validatedData = schema.createTicketFormSchema.parse(formData);

	const [priority] = await db
		.select()
		.from(schema.priority)
		.where(eq(schema.priority.id, validatedData.priorityId));

	if (!priority) {
		throw new NotFoundError('Priority not found');
	}

	const [status] = await db
		.select()
		.from(schema.status)
		.where(eq(schema.status.id, validatedData.statusId));

	if (!status) {
		throw new NotFoundError('Status not found');
	}

	if (validatedData.categoryId) {
		const [category] = await db
			.select()
			.from(schema.category)
			.where(eq(schema.category.id, validatedData.categoryId));

		if (!category) {
			throw new NotFoundError('Category not found');
		}
	}

	if (validatedData.assigneeId) {
		const [assignee] = await db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, validatedData.assigneeId));

		if (!assignee) {
			throw new NotFoundError('Assignee not found');
		}
	}

	const result = await db.transaction(async (tx) => {
		const [attachmentOptions] = await tx
			.select()
			.from(schema.config)
			.where(eq(schema.config.key, 'attachments'));

		if (!attachmentOptions) {
			throw new NotFoundError(
				'Attachment configuration not found. Please configure attachments in Settings.'
			);
		}

		const attachmentConfig = attachmentOptions.value as Attachment;

		if (!attachmentConfig) {
			throw new ValidationError('Invalid attachment configuration.');
		}

		// Create ticket
		const [newTicket] = await tx
			.insert(schema.ticket)
			.values({
				requesterId: validatedData.requesterId,
				assigneeId: validatedData.assigneeId,
				subject: validatedData.subject,
				channel: validatedData.channel as 'email' | 'portal' | 'user',
				statusId: validatedData.statusId,
				priorityId: validatedData.priorityId,
				categoryId: validatedData.categoryId,
				targetDate: validatedData.targetDate,
				responseCount: 0,
				firstResponseAt: null,
				resolvedAt: null,
				closedAt: null,
				lastUserResponseAt: null,
				lastRequesterResponseAt: null
			})
			.returning();

		// Create ticket message
		const [ticketMessage] = await tx
			.insert(schema.ticketMessage)
			.values({
				ticketId: newTicket.id,
				senderType: 'user',
				requesterId: null,
				senderName: user.name,
				senderEmail: user.email,
				userId: user.id,
				message: validatedData.message,
				isPrivate: validatedData.isPrivate,
				channel: 'dashboard',
				isFirstResponse: false,
				hasAttachments: validatedData.files.length > 0
			})
			.returning();

		const tagIds: number[] = [];
		for (const tagName of validatedData.tags) {
			const existingTag = await tx.query.tag.findFirst({
				where: (tag, { eq }) => eq(tag.name, tagName)
			});

			if (existingTag) {
				tagIds.push(existingTag.id);
			} else {
				const [newTag] = await tx
					.insert(schema.tag)
					.values({ name: tagName })
					.returning({ id: schema.tag.id });
				tagIds.push(newTag.id);
			}
		}
		if (tagIds.length !== 0) {
			const tagAssociations = tagIds.map((tagId) => ({
				ticketId: newTicket.id,
				tagId
			}));

			await tx.insert(schema.ticketTag).values(tagAssociations).onConflictDoNothing();
		}

		for (const file of validatedData.files) {
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
			messageId: ticketMessage.id,
			assigneeId: newTicket.assigneeId
		};
	});

	// Send notification if assigned to someone else
	if (result.assigneeId && result.assigneeId !== user.id) {
		const ticket = await db.query.ticket.findFirst({
			where: eq(schema.ticket.id, result.ticketId),
			with: {
				status: true,
				priority: true,
				category: true,
				assignee: true,
				requester: true
			}
		});

		await sendNotification({
			title: 'Ticket assigned to you',
			message: `New ticket assigned by ${user.name}: ${validatedData.subject}`,
			recipient: { userId: result.assigneeId },
			channels: ['dashboard', 'email'],
			notification: {
				type: 'entity',
				event: 'assigned',
				entity: { type: 'ticket', data: ticket as Ticket }
			}
		});
	}

	return json(
		{
			success: true,
			message: 'Ticket created successfully'
		},
		{ status: 201 }
	);
};

export const PATCH: RequestHandler = async ({ request }): Promise<Response> => {
	const bulkUpdateSchema = z.object({
		ids: z.array(z.number().int().positive()).min(1, 'At least one ticket ID required'),
		ticket: schema.updateTicketSchema
	});
	const { ids, ticket } = await schema.validate(bulkUpdateSchema)(request);
	console.log(ticket);

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

	const updateData: Partial<Ticket> = {};

	if (ticket.subject !== undefined) updateData.subject = ticket.subject;
	if (ticket.assigneeId !== undefined) updateData.assigneeId = ticket.assigneeId;
	if (ticket.statusId !== undefined) updateData.statusId = ticket.statusId;
	if (ticket.priorityId !== undefined) updateData.priorityId = ticket.priorityId;
	if (ticket.categoryId !== undefined) updateData.categoryId = ticket.categoryId;
	if (ticket.requesterId !== undefined) updateData.requesterId = ticket.requesterId;
	if (ticket.targetDate !== undefined) {
		updateData.targetDate = ticket.targetDate ? new Date(ticket.targetDate) : new Date();
	}

	if (ticket.statusId) {
		const [status] = await db
			.select()
			.from(schema.status)
			.where(eq(schema.status.id, ticket.statusId));

		if (status) {
			if (status.isResolved) {
				updateData.resolvedAt = new Date();
			} else {
				updateData.resolvedAt = null;
			}

			if (status.isClosed) {
				updateData.closedAt = new Date();
			} else {
				updateData.closedAt = null;
			}
		}
	}

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
	const ids = await schema.validate(schema.idsBulkSchema)(request);

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
