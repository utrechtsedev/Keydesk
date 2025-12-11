import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { generateTemplate, sendEmail } from "$lib/server/email";
import type { Organization, TicketMessage, Ticket } from "$lib/types";
import { logger } from "$lib/server/logger";

export interface NotificationOptions {
  title: string;
  message: string;
  userId?: number;
  userIds?: number[];
  allUsers?: boolean;
  email?: string;
  type: "info" | "success" | "warning" | "error" | "ticket" | "system";
  channel: "dashboard" | "email";
  relatedEntityType?: "ticket" | "user" | "system" | null;
  relatedEntityId?: number | null;
  actionUrl: string;
  createdById?: number | null;
  ticket?: Ticket;
  ticketMessage?: TicketMessage;
}

/**
 * Helper: Process notification for a single user
 */
async function processUserNotification(
  user: { id: number; email: string; name: string },
  options: NotificationOptions,
  organization: Organization | null
): Promise<void> {
  if (!options.ticket) throw new Error('Ticket required');

  const [notification] = await db
    .insert(schema.notification)
    .values({
      title: options.title,
      message: options.message,
      type: options.type,
      channel: options.channel,
      relatedEntityType: options.relatedEntityType,
      relatedEntityId: options.ticket.id,
      actionUrl: options.actionUrl,
    })
    .returning();

  await db.insert(schema.userNotification).values({
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

    let organization: Organization | null = null;

    if (options.channel === 'email' || options.email) {
      const [orgConfig] = await db
        .select()
        .from(schema.config)
        .where(eq(schema.config.key, 'organization'));

      organization = orgConfig ? (orgConfig.value as Organization) : null;
    }

    if ((options.channel === 'email' || options.email) && !organization) {
      throw new Error('Organization config not found');
    }

    if (options.email && options.relatedEntityType === 'ticket') {
      if (!options.ticket) throw new Error('Ticket required');

      await db.insert(schema.notification).values({
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

    let users: Array<{ id: number; email: string; name: string }> = [];

    if (options.userId) {
      const [user] = await db
        .select({
          id: schema.user.id,
          email: schema.user.email,
          name: schema.user.name,
        })
        .from(schema.user)
        .where(eq(schema.user.id, options.userId));

      if (user) users = [user];
    } else if (options.userIds && options.userIds.length > 0) {
      users = await db
        .select({
          id: schema.user.id,
          email: schema.user.email,
          name: schema.user.name,
        })
        .from(schema.user)
        .where(inArray(schema.user.id, options.userIds));
    } else if (options.allUsers) {
      users = await db
        .select({
          id: schema.user.id,
          email: schema.user.email,
          name: schema.user.name,
        })
        .from(schema.user);
    }

    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            await processUserNotification(user, options, organization);
            logger.info(`${options.channel === 'email' ? 'Email' : 'Notification'} sent to ${user.email}`);
          } catch (error) {
            logger.error({ error }, `Failed to process ${user.email}:`);
          }
        })
      );
    }

  } catch (error) {
    logger.error({ error }, 'Error in handleSendNotification:');
    throw error;
  }
}
