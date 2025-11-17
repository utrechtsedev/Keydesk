import { Config, Ticket, TicketAttachment, TicketMessage } from '$lib/server/db/models';
import { uploadFile } from '$lib/server/file-upload';
import type { Attachment, NotificationSettings } from '$lib/types';
import { json, error, type RequestHandler } from '@sveltejs/kit';
import { sequelize } from '$lib/server/db/instance';
import { createNotification } from '$lib/server/notification';

// TODO: Sending email to requester after saving message
export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
  const transaction = await sequelize.transaction();

  try {
    if (!locals.user) {
      return error(401, { message: 'User not authenticated.' });
    }

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const isPrivate = formData.get('isPrivate') as string;
    const ticketId = formData.get('ticketId') as string;
    const files = formData.getAll('files').filter((file): file is File => file instanceof File);

    if (!message || message.trim() === '') {
      await transaction.rollback();
      return error(400, { message: 'Message is required.' });
    }

    if (!ticketId || isNaN(Number(ticketId))) {
      await transaction.rollback();
      return error(400, { message: 'Valid ticket ID is required.' });
    }

    if (!isPrivate) {
      await transaction.rollback();
      return error(400, { message: 'Privacy setting is required.' });
    }

    let isPrivateValue: boolean;
    try {
      isPrivateValue = JSON.parse(isPrivate);
      if (typeof isPrivateValue !== 'boolean') {
        await transaction.rollback();
        return error(400, { message: 'Invalid privacy setting format.' });
      }
    } catch (err) {
      await transaction.rollback();
      return error(400, { message: 'Invalid privacy setting format.' });
    }

    const attachmentOptions = await Config.findOne({ where: { key: 'attachments' } });
    if (!attachmentOptions) {
      await transaction.rollback();
      return error(500, { message: 'Attachment configuration not found. Please configure attachments in Settings.' });
    }

    let attachmentConfig: Attachment;
    try {
      attachmentConfig = attachmentOptions.value as Attachment;
    } catch (err) {
      console.error('Failed to parse attachment configuration:', err);
      await transaction.rollback();
      return error(500, { message: 'Invalid attachment configuration.' });
    }

    const ticketMessages = await TicketMessage.count({
      where: { ticketId: Number(ticketId) }
    });

    const ticketMessage = await TicketMessage.create({
      ticketId: Number(ticketId),
      senderType: 'user',
      requesterId: null,
      senderName: locals.user.name,
      senderEmail: locals.user.email,
      userId: locals.user.id,
      message,
      isPrivate: isPrivateValue,
      channel: 'dashboard',
      isFirstResponse: ticketMessages > 0,
      hasAttachments: files.length > 0,
    }, { transaction });

    for (const file of files) {
      const fileUpload = await uploadFile(file, attachmentConfig);

      await TicketAttachment.create({
        ticketId,
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

    const ticket = await Ticket.findOne({ where: { id: ticketId } })

    const fetchNotificationConfig = await Config.findOne({ where: { key: 'notifications' } });

    if (!fetchNotificationConfig) {
      throw new Error('Could not create notification for new Ticket Message.');
    }

    const notificationConfig = fetchNotificationConfig.value as NotificationSettings;


    // if ticket message sender is not assignee of ticket, notify assignee
    if (ticket && ticket.assignedUserId && ticket.assignedUserId !== locals.user.id) {
      if (notificationConfig.dashboard.ticket.updated.notifyUser)
        createNotification({
          title: "Ticket updated",
          message: `Ticket ${ticket.id} updated by ${locals.user.name}`,
          type: "ticket",
          channel: "dashboard",
          actionUrl: `/dashboard/tickets/${ticket.id}`,
          relatedEntityId: ticket.id,
          relatedEntityType: "ticket",
          userId: ticket.assignedUserId
        })

      if (notificationConfig.email.ticket.updated.notifyUser)
        createNotification({
          title: "Ticket updated",
          message: `Ticket ${ticket.id} updated by ${locals.user.name}`,
          type: "ticket",
          channel: "dashboard",
          actionUrl: `/dashboard/tickets/${ticket.id}`,
          relatedEntityId: ticket.id,
          relatedEntityType: "ticket",
          userId: ticket.assignedUserId
        })
    }

    return json({
      success: true,
      data: {
        messageId: ticketMessage.id,
      },
      message: 'Message sent successfully.',
    }, { status: 201 });

  } catch (err) {
    await transaction.rollback();
    console.error('Error creating ticket message:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: errorMessage,
      error: errorMessage
    }, { status: 500 });
  }
};
