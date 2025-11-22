import { Config, Notification, Ticket, User, UserNotification } from "$lib/server/db/models";
import { generateTemplate, sendEmail } from "$lib/server/email";
import type { Organization, TicketMessage } from "$lib/types";

export interface NotificationOptions {
  title: string;
  message: string;
  userId?: string;
  userIds?: string[];
  allUsers?: boolean;
  email?: string;
  type: "info" | "success" | "warning" | "error" | "ticket" | "system";
  channel: "dashboard" | "email";
  relatedEntityType?: "ticket" | "user" | "system" | null;
  relatedEntityId?: number | null;
  actionUrl: string;
  createdById?: string | null;
  ticket?: Ticket;
  ticketMessage?: TicketMessage;
}

/**
 * Helper: Process notification for a single user
 */
async function processUserNotification(
  user: { id: string; email: string; name: string },
  options: NotificationOptions,
  organization: Organization | null
): Promise<void> {
  if (!options.ticket) throw new Error('Ticket required');

  const notification = await Notification.create({
    title: options.title,
    message: options.message,
    type: options.type,
    channel: options.channel,
    relatedEntityType: options.relatedEntityType,
    relatedEntityId: options.ticket.id,
    actionUrl: options.actionUrl,
  });

  await UserNotification.create({
    notificationId: notification.id,
    userId: user.id,
    isRead: false,
    sentViaEmail: options.channel === 'email',
  });

  if (options.channel === 'email' && organization) {
    const template = await generateTemplate({
      ticket: options.ticket,
      status: options.ticket.status,
      ticketMessage: options.ticketMessage,
      organization,
      actionUrl: options.actionUrl,
      unsubscribeLink: '',
      to: user.email,
      template: 'user',
      type: options.type,
    });
    await sendEmail(user.email, options.title, template);
  }
}

/**
 * Handler for sending notifications
 */
export async function handleSendNotification(options: NotificationOptions): Promise<void> {
  try {
    if (!options.userId && !options.userIds && !options.allUsers && !options.email) {
      throw new Error('Must specify at least one recipient option');
    }

    const organization = options.channel === 'email' || options.email
      ? (await Config.findOne({ where: { key: 'organization' } }) as Organization | null)
      : null;

    if ((options.channel === 'email' || options.email) && !organization) {
      throw new Error('Organization config not found');
    }

    if (options.email && options.relatedEntityType === 'ticket') {
      if (!options.ticket) throw new Error('Ticket required');

      await Notification.create({
        title: options.title,
        message: options.message,
        type: options.type,
        channel: options.channel,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.ticket.id,
        actionUrl: options.actionUrl,
      });

      const template = await generateTemplate({
        ticket: options.ticket,
        status: options.ticket.status,
        ticketMessage: options.ticketMessage,
        organization: organization!,
        actionUrl: options.actionUrl,
        unsubscribeLink: '',
        to: options.email,
        template: 'requester',
        type: options.type,
      });

      await sendEmail(options.email, options.title, template);
      return;
    }

    let users: User[] = [];

    if (options.userId) {
      const user = await User.findOne({
        where: { id: options.userId },
        attributes: ['id', 'email', 'name'],
      });
      if (user) users = [user];
    } else if (options.userIds) {
      users = await User.findAll({
        where: { id: options.userIds },
        attributes: ['id', 'email', 'name'],
      });
    } else if (options.allUsers) {
      users = await User.findAll({
        attributes: ['id', 'email', 'name'],
      });
    }

    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            await processUserNotification(user, options, organization);
            console.log(`✅ ${options.channel === 'email' ? 'Email' : 'Notification'} sent to ${user.email}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to process ${user.email}:`, errorMessage);
          }
        })
      );
    }

  } catch (error) {
    console.error('❌ Error in handleSendNotification:', error);
    throw error;
  }
}
