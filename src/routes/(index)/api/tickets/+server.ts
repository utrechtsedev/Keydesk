import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { uploadFile } from '$lib/server/file-upload';
import { generateTicketNumber } from '$lib/server/ticket';
import type { Attachment } from '$lib/types';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
  try {
    const result = await db.transaction(async (tx) => {
      const formData = await request.formData();
      const subject = formData.get('subject') as string;
      const message = formData.get('message') as string;
      const isPrivate = formData.get('isPrivate') as string;
      const requesterId = formData.get('requesterId') as string;
      const assignedUserId = formData.get('assignedUserId') as string;
      const categoryId = formData.get('categoryId') as string;
      const priorityId = formData.get('priorityId') as string;
      const statusId = formData.get('statusId') as string;
      const channel = formData.get('channel') as string || 'portal';
      const targetDate = formData.get('targetDate') as string;
      const files = formData.getAll('files').filter((file): file is File => file instanceof File);

      // Validation
      if (!subject || subject.trim() === '') {
        throw new Error('Subject is required.');
      }

      if (!message || message.trim() === '') {
        throw new Error('Message is required.');
      }

      if (!requesterId || isNaN(Number(requesterId))) {
        throw new Error('Valid requester ID is required.');
      }

      if (!categoryId || isNaN(Number(categoryId))) {
        throw new Error('Valid category ID is required.');
      }

      if (!priorityId || isNaN(Number(priorityId))) {
        throw new Error('Valid priority ID is required.');
      }

      if (!statusId || isNaN(Number(statusId))) {
        throw new Error('Valid status ID is required.');
      }

      if (!targetDate) {
        throw new Error('Target date is required.');
      }

      let isPrivateValue: boolean;
      try {
        isPrivateValue = JSON.parse(isPrivate);
        if (typeof isPrivateValue !== 'boolean') {
          throw new Error('Invalid privacy setting format.');
        }
      } catch (err) {
        throw new Error('Invalid privacy setting format.');
      }

      // Get attachment configuration
      const [attachmentOptions] = await tx
        .select()
        .from(schema.config)
        .where(eq(schema.config.key, 'attachments'));

      if (!attachmentOptions) {
        throw new Error('Attachment configuration not found. Please configure attachments in Settings.');
      }

      let attachmentConfig: Attachment;
      try {
        attachmentConfig = attachmentOptions.value as Attachment;
      } catch (err) {
        console.error('Failed to parse attachment configuration:', err);
        throw new Error('Invalid attachment configuration.');
      }

      // Generate ticket number (pass tx if the function needs it)
      const ticketNumber = await generateTicketNumber(tx);

      // Create ticket
      const [newTicket] = await tx
        .insert(schema.ticket)
        .values({
          ticketNumber,
          requesterId: Number(requesterId),
          assignedUserId: assignedUserId ? parseInt(assignedUserId, 10) : null,
          subject,
          channel: channel as "email" | "portal" | "user",
          statusId: Number(statusId),
          priorityId: Number(priorityId),
          categoryId: Number(categoryId),
          targetDate: new Date(targetDate),
          responseCount: 0,
          firstResponseAt: null,
          resolvedAt: null,
          closedAt: null,
          lastUserResponseAt: null,
          lastRequesterResponseAt: null,
        })
        .returning();

      // Create ticket message
      const [ticketMessage] = await tx
        .insert(schema.ticketMessage)
        .values({
          ticketId: newTicket.id,
          senderType: 'user',
          requesterId: null,
          senderName: locals.user.name,
          senderEmail: locals.user.email,
          userId: locals.user.id,
          message,
          isPrivate: isPrivateValue,
          channel: 'dashboard',
          isFirstResponse: false,
          hasAttachments: files.length > 0,
        })
        .returning();

      // Upload files and create attachments
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
          uploadedById: locals.user.id,
          uploadedByName: locals.user.name,
          downloadCount: 0,
        });
      }

      return {
        ticketId: newTicket.id,
        ticketNumber: newTicket.ticketNumber,
        messageId: ticketMessage.id,
      };
    });

    return json({
      success: true,
      data: result,
      message: 'Ticket created successfully.',
    }, { status: 201 });

  } catch (err) {
    console.error('Error creating ticket:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // Map validation errors to 400 status
    const validationErrors = [
      'required', 'Valid', 'Invalid', 'format', 'configuration not found'
    ];
    const isValidationError = validationErrors.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    return json({
      success: false,
      message: isValidationError ? errorMessage : 'Failed to create ticket',
      error: errorMessage
    }, { status: isValidationError ? 400 : 500 });
  }
};
