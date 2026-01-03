import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { uploadFile } from '$lib/server/file-upload';
import type { Attachment } from '$lib/types';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { NotFoundError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { user } = requireAuth(locals);

	const formData = await request.formData();

	const validatedData = schema.addTicketMessageFormSchema.parse(schema.parseFormData(formData));

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

		const attachmentConfig: Attachment = attachmentOptions.value as Attachment;

		const [messageCount] = await tx
			.select({ count: sql<number>`count(*)` })
			.from(schema.ticketMessage)
			.where(eq(schema.ticketMessage.ticketId, validatedData.ticketId));

		const ticketMessages = Number(messageCount.count);

		const [ticketMessage] = await tx
			.insert(schema.ticketMessage)
			.values({
				ticketId: validatedData.ticketId,
				senderType: 'user',
				requesterId: null,
				senderName: user.name,
				senderEmail: user.email,
				userId: user.id,
				message: validatedData.message,
				isPrivate: validatedData.isPrivate,
				channel: 'dashboard',
				isFirstResponse: ticketMessages === 0,
				hasAttachments: validatedData.files.length > 0
			})
			.returning();

		for (const file of validatedData.files) {
			const fileUpload = await uploadFile(file, attachmentConfig);

			await tx.insert(schema.ticketAttachment).values({
				ticketId: validatedData.ticketId,
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

		return ticketMessage;
	});

	return json(
		{
			success: true,
			data: {
				messageId: result.id
			},
			message: 'Message sent successfully.'
		},
		{ status: 201 }
	);
};
