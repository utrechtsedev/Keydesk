import { Ticket, TicketMessage, TicketAttachment, Config } from '$lib/server/db/models';
import { uploadFile } from '$lib/server/file-upload';
import { generateTicketNumber } from '$lib/server/ticket';
import type { Attachment } from '$lib/types';
import { json, type RequestHandler } from '@sveltejs/kit';
import { sequelize } from '$lib/server/db/instance';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
  const transaction = await sequelize.transaction();
  let hasRolledBack = false;

  try {
    if (!locals.user) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'User not authenticated.' }, { status: 401 });
    }

    const formData = await request.formData();

    // Extract ticket fields
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

    // Validate required fields
    if (!subject || subject.trim() === '') {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Subject is required.' }, { status: 400 });
    }

    if (!message || message.trim() === '') {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Message is required.' }, { status: 400 });
    }

    if (!requesterId || isNaN(Number(requesterId))) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Valid requester ID is required.' }, { status: 400 });
    }

    if (!categoryId || isNaN(Number(categoryId))) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Valid category ID is required.' }, { status: 400 });
    }

    if (!priorityId || isNaN(Number(priorityId))) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Valid priority ID is required.' }, { status: 400 });
    }

    if (!statusId || isNaN(Number(statusId))) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Valid status ID is required.' }, { status: 400 });
    }

    if (!targetDate) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Target date is required.' }, { status: 400 });
    }

    // Parse isPrivate
    let isPrivateValue: boolean;
    try {
      isPrivateValue = JSON.parse(isPrivate);
      if (typeof isPrivateValue !== 'boolean') {
        await transaction.rollback();
        hasRolledBack = true;
        return json({ success: false, message: 'Invalid privacy setting format.' }, { status: 400 });
      }
    } catch (err) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Invalid privacy setting format.' }, { status: 400 });
    }

    // Get attachment configuration
    const attachmentOptions = await Config.findOne({ where: { key: 'attachments' } });
    if (!attachmentOptions) {
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Attachment configuration not found. Please configure attachments in Settings.' }, { status: 500 });
    }

    let attachmentConfig: Attachment;
    try {
      attachmentConfig = JSON.parse(attachmentOptions.value) as Attachment;
    } catch (err) {
      console.error('Failed to parse attachment configuration:', err);
      await transaction.rollback();
      hasRolledBack = true;
      return json({ success: false, message: 'Invalid attachment configuration.' }, { status: 500 });
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber(transaction);

    // Create the ticket
    const newTicket = await Ticket.create({
      ticketNumber,
      requesterId: Number(requesterId),
      assignedUserId: assignedUserId || null,
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
    }, { transaction });

    // Create the initial ticket message
    const ticketMessage = await TicketMessage.create({
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
    }, { transaction });

    // Upload files and create attachments
    for (const file of files) {
      const fileUpload = await uploadFile(file, attachmentConfig);

      await TicketAttachment.create({
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
      }, { transaction });
    }

    await transaction.commit();

    return json({
      success: true,
      data: {
        ticketId: newTicket.id,
        ticketNumber: newTicket.ticketNumber,
        messageId: ticketMessage.id,
      },
      message: 'Ticket created successfully.',
    }, { status: 201 });

  } catch (err) {
    if (!hasRolledBack) {
      await transaction.rollback();
    }
    console.error('Error creating ticket:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to create ticket',
      error: errorMessage
    }, { status: 500 });
  }
};
