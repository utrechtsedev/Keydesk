import { requireAuth } from '$lib/server/auth-helpers';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { uploadFile } from '$lib/server/file-upload';
import { generateTicketNumber } from '$lib/server/ticket';
import type { Attachment } from '$lib/types';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
  const { user } = requireAuth(locals);

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

  const result = await db.transaction(async (tx) => {

    // Validation
    if (!subject || subject.trim() === '')
      throw new ValidationError('Subject is required.');


    if (!message || message.trim() === '')
      throw new ValidationError('Message is required.');

    if (!requesterId || isNaN(Number(requesterId)))
      throw new ValidationError('Valid requester ID is required.');

    if (!categoryId || isNaN(Number(categoryId)))
      throw new ValidationError('Valid category ID is required.');

    if (!priorityId || isNaN(Number(priorityId)))
      throw new ValidationError('Valid priority ID is required.');

    if (!statusId || isNaN(Number(statusId)))
      throw new ValidationError('Valid status ID is required.');

    if (!targetDate)
      throw new ValidationError('Target date is required.');

    const isPrivateValue = JSON.parse(isPrivate);

    if (typeof isPrivateValue !== 'boolean')
      throw new ValidationError('Invalid privacy setting format.');


    const [attachmentOptions] = await tx
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'attachments'));

    if (!attachmentOptions)
      throw new NotFoundError('Attachment configuration not found. Please configure attachments in Settings.');

    const attachmentConfig = attachmentOptions.value as Attachment;

    if (!attachmentConfig)
      throw new ValidationError('Invalid attachment configuration.');

    const ticketNumber = await generateTicketNumber(tx);

    const [newTicket] = await tx
      .insert(schema.ticket)
      .values({
        ticketNumber,
        requesterId: Number(requesterId),
        assignedUserId: assignedUserId ? parseInt(assignedUserId, 10) : null,
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
        lastRequesterResponseAt: null,
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
        hasAttachments: files.length > 0,
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
};
