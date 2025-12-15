import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { uploadFile } from '$lib/server/file-upload';
import type { Attachment } from '$lib/types';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth-helpers';
import { NotFoundError, ValidationError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
  const { user } = requireAuth(locals)

  const formData = await request.formData();
  const message = formData.get('message') as string;
  const isPrivate = formData.get('isPrivate') as string;
  const ticketId = formData.get('ticketId') as string;
  const files = formData.getAll('files').filter((file): file is File => file instanceof File);

  const result = await db.transaction(async (tx) => {

    if (!message || message.trim() === '')
      throw new ValidationError('Message is required.')

    if (!ticketId || isNaN(Number(ticketId)))
      throw new ValidationError('Valid ticket ID is required.')

    const isPrivateValue: boolean = isPrivate === 'true';

    // Get attachment configuration
    const [attachmentOptions] = await tx
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'attachments'));

    if (!attachmentOptions)
      throw new NotFoundError('Attachment configuration not found. Please configure attachments in Settings.')

    let attachmentConfig: Attachment = attachmentOptions.value as Attachment;

    // Count existing messages for this ticket
    const [messageCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(schema.ticketMessage)
      .where(eq(schema.ticketMessage.ticketId, Number(ticketId)));

    const ticketMessages = Number(messageCount.count);

    // Create the ticket message
    const [ticketMessage] = await tx
      .insert(schema.ticketMessage)
      .values({
        ticketId: Number(ticketId),
        senderType: 'user',
        requesterId: null,
        senderName: user.name,
        senderEmail: user.email,
        userId: user.id,
        message,
        isPrivate: isPrivateValue,
        channel: 'dashboard',
        isFirstResponse: ticketMessages === 0,
        hasAttachments: files.length !== 0,
      })
      .returning();

    // Upload files and create attachment records
    for (const file of files) {
      const fileUpload = await uploadFile(file, attachmentConfig);

      await tx.insert(schema.ticketAttachment).values({
        ticketId: Number(ticketId),
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

    return ticketMessage;
  });

  // Fetch ticket with relations (outside transaction for notifications)
  const ticket = await db.query.ticket.findFirst({
    where: eq(schema.ticket.id, Number(ticketId)),
    with: {
      requester: true,
      status: true,
    },
  });

  return json({
    success: true,
    data: {
      messageId: result.id,
    },
    message: 'Message sent successfully.',
  }, { status: 201 });
};
