import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { NotificationOptions, NotificationPreferences, NotificationSettings, Organization } from "$lib/types";
import { logger } from "$lib/server/logger";
import { generateEmailTemplate, sendEmail } from "$lib/server/email";

/**
 * Handler for sending notifications
 */
export async function handleSendNotification(options: NotificationOptions): Promise<void> {
  try {
    const [getOrganization] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'organization'));

    if (!getOrganization) {
      throw new Error('Could not send notification. Organization configuration not found.');
    }
    
    const organization: Organization = getOrganization.value as Organization;

    // Handle external email notifications (non-user recipients)
    if ('email' in options.recipient) {
      return await sendExternalEmailNotification(options, organization);
    }

    // Handle user notifications
    const users = await fetchUsers(options);
    
    if (users.length === 0) {
      logger.warn('No users found for notification');
      return;
    }

    await processUserNotifications(users, options, organization);

  } catch (error) {
    logger.error({ error }, 'Error in handleSendNotification');
    throw error;
  }
}

/**
 * Process notifications for internal users
 */
async function processUserNotifications(
  users: typeof schema.user.$inferSelect[],
  options: NotificationOptions,
  organization: Organization
): Promise<void> {
  // Get admin settings
  const [adminSettingsConfig] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'notifications'));
  
  const adminSettings: NotificationSettings = adminSettingsConfig?.value as NotificationSettings;

  const { relatedEntityType, relatedEntityId, notificationType } = extractNotificationData(options);
  
  const batchSize = 10;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (user) => {
        try {
          // Process each channel
          for (const channel of options.channels) {
            // Check if this specific channel should be sent
            const shouldSend = shouldSendNotification({
              adminSettings,
              user,
              options,
              channel
            });

            if (!shouldSend) {
              logger.info(`${channel} notification skipped for ${user.email} based on settings`);
              continue;
            }

            const actionUrl = generateActionUrl(options);

            const [notification] = await db
              .insert(schema.notification)
              .values({
                title: options.title,
                message: options.message,
                type: notificationType,
                channel: channel,
                relatedEntityType: relatedEntityType,
                relatedEntityId: relatedEntityId,
                actionUrl: actionUrl,
              })
              .returning();

            await db.insert(schema.userNotification).values({
              notificationId: notification.id,
              userId: user.id,
              isRead: false,
              sentViaEmail: channel === 'email',
            });

            if (channel === 'email') {
              try {
                // Fetch full entity data for email template
                const fullEntityData = await fetchEntityData(options);

                const emailHtml = generateEmailTemplate({
                  options: {
                    ...options,
                    notification: options.notification.type === 'entity' 
                      ? {
                        ...options.notification,
                        entity: {
                          type: options.notification.entity.type,
                          data: fullEntityData
                        } as any 
                      }
                      : options.notification
                  } as NotificationOptions, 
                  organization,
                  recipientEmail: user.email,
                  actionUrl
                });

                await sendEmail(user.email, options.title, emailHtml);
                logger.info(`Email sent successfully to ${user.email}`);
              } catch (emailError) {
                logger.error({ err: emailError, userId: user.id }, `Failed to send email to ${user.email}`);
              }
            } else {
              logger.info(`Dashboard notification sent to ${user.email}`);
            }
          }
        } catch (error) {
          logger.error({ err: error, userId: user.id }, `Failed to process notification for ${user.email}`);
        }
      })
    );
  }
}

async function sendExternalEmailNotification(
  options: NotificationOptions,
  organization: Organization
): Promise<void> {
  if (!('email' in options.recipient)) {
    throw new Error('Email recipient required for external notifications');
  }

  // Get admin settings
  const [adminSettingsConfig] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'notifications'));
  
  const adminSettings: NotificationSettings = adminSettingsConfig?.value as NotificationSettings;

  // Check if admin allows this notification to requesters
  const shouldSend = shouldSendNotification({
    adminSettings,
    user: null,
    options,
    channel: 'email'
  });

  if (!shouldSend) {
    logger.info(`External email notification skipped for ${options.recipient.email} based on admin settings`);
    return;
  }

  const { relatedEntityType, relatedEntityId, notificationType } = extractNotificationData(options);
  const actionUrl = generateActionUrl(options, true);

  if (options.notification.type === 'entity') {
    await db.insert(schema.notification).values({
      title: options.title,
      message: options.message,
      type: notificationType,
      channel: 'email',
      relatedEntityType: relatedEntityType,
      relatedEntityId: relatedEntityId,
      actionUrl: actionUrl,
    });
  }

  try {
    // Fetch full entity data for email template
    const fullEntityData = await fetchEntityData(options);

    const emailHtml = generateEmailTemplate({
      options: {
        ...options,
        notification: options.notification.type === 'entity' 
          ? {
            ...options.notification,
            entity: {
              type: options.notification.entity.type,
              data: fullEntityData
            } as any // Type assertion to allow data property
          }
          : options.notification
      } as NotificationOptions, // Type assertion for the whole options object
      organization,
      recipientEmail: options.recipient.email,
      actionUrl
    });

    await sendEmail(options.recipient.email, options.title, emailHtml);
    logger.info(`External email sent successfully to ${options.recipient.email}`);
  } catch (emailError) {
    logger.error({ err: emailError, email: options.recipient.email }, `Failed to send external email`);
    throw emailError;
  }
}

/**
 * Fetch full entity data with all required relations for email templates
 */
async function fetchEntityData(options: NotificationOptions): Promise<any> {
  if (options.notification.type !== 'entity') {
    return null;
  }

  const { entity } = options.notification;

  if (entity.type === 'ticket') {
    const ticket = await db.query.ticket.findFirst({
      where: eq(schema.ticket.id, entity.id),
      with: {
        status: true,
        priority: true,
        requester: true,
        assignedUser: true,
        category: true,
      }
    });

    if (!ticket) {
      throw new Error(`Ticket with ID ${entity.id} not found`);
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
      status: ticket.status,
      priority: ticket.priority,
      requester: ticket.requester,
      assignedTo: ticket.assignedUser,
    };
  }

  if (entity.type === 'task') {
    const task = await db.query.task.findFirst({
      where: eq(schema.task.id, entity.id),
      with: {
        status: true,
        priority: true,
        assignee: true,
        creator: true,
      }
    });

    if (!task) {
      throw new Error(`Task with ID ${entity.id} not found`);
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignee,
      createdBy: task.creator,
    };
  }

  return null;
}

/**
 * Fetch users based on recipient criteria
 */
async function fetchUsers(options: NotificationOptions): Promise<typeof schema.user.$inferSelect[]> {
  if ('userId' in options.recipient) {
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, options.recipient.userId));

    return user ? [user] : [];
  }
  
  if ('userIds' in options.recipient) {
    if (options.recipient.userIds.length === 0) return [];
    
    return await db
      .select()
      .from(schema.user)
      .where(inArray(schema.user.id, options.recipient.userIds));
  }
  
  if ('allUsers' in options.recipient) {
    return await db.select().from(schema.user);
  }

  return [];
}

/**
 * Extract notification data for database storage
 */
function extractNotificationData(options: NotificationOptions): {
  relatedEntityType: "ticket" | "task" | "user" | "system" | null;
  relatedEntityId: number | null;
  notificationType: "info" | "success" | "warning" | "error" | "ticket" | "task" | "system";
} {
  if (options.notification.type === 'entity') {
    const entityType = options.notification.entity.type;
    const entityId = options.notification.entity.id; // Changed from entity.data.id
    
    return {
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      notificationType: entityType, // "ticket" or "task"
    };
  }

  // System notification
  return {
    relatedEntityType: 'system',
    relatedEntityId: null,
    notificationType: options.notification.type,
  };
}

/**
 * Generate action URL based on notification type
 */
function generateActionUrl(options: NotificationOptions, external: boolean = false): string {
  // Get base URL from environment variable
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
  
  if (options.notification.type === 'entity') {
    const { entity } = options.notification;
    
    if (entity.type === 'ticket') {
      const ticketId = entity.id; // Changed from entity.data.id
      // For external users, might need a different URL with access token
      if (external) {
        // TODO: Generate secure access token for external ticket access
        return `${baseUrl}/portal/tickets/${ticketId}`;
      }
      return `${baseUrl}/tickets/${ticketId}`;
    }
    
    if (entity.type === 'task') {
      const taskId = entity.id; // Changed from entity.data.id
      return `${baseUrl}/tasks/${taskId}`;
    }
  }
  
  // For system notifications, return dashboard or relevant page
  return `${baseUrl}/dashboard`;
}

/**
 * Determines if a notification should be sent based on admin settings and user preferences
 * Admin settings act as master switch - if disabled, notification won't send
 * User preferences provide additional opt-out capability for internal users
 * 
 * @param adminSettings - Organization-wide notification settings
 * @param user - User object with notificationPreferences (null for external recipients)
 * @param options - NotificationOptions from the main handler
 * @param channel - Which channel to check ('dashboard' or 'email')
 * @returns true if notification should be sent, false otherwise
 */
export function shouldSendNotification(
  { adminSettings, user, options, channel }: { 
    adminSettings: NotificationSettings,
    user: typeof schema.user.$inferSelect | null, 
    options: NotificationOptions, 
    channel: 'dashboard' | 'email' }): boolean {

  // Derive parameters from options
  const isRequester = 'email' in options.recipient;
  const isAllUsers = 'allUsers' in options.recipient;
  const event = options.notification.event;
  const notificationType = options.notification.type;
  const userPreferences = user?.notificationPreferences as NotificationPreferences;

  // System notifications (info, success, warning, error, system) always send
  // They bypass admin item settings since they're not entity-related
  if (notificationType !== 'entity') {
    return true;
  }

  // ============================================
  // DASHBOARD NOTIFICATIONS
  // ============================================
  if (channel === 'dashboard') {
    // Dashboard doesn't support external users (requesters)
    if (isRequester) return false;

    // Check admin settings for "notify all users on new ticket"
    if (event === 'created' && isAllUsers) {
      const adminAllows = adminSettings.dashboard.notifyAllUsersOnNewTicket;
      if (!adminAllows) return false;
      
      // Check user preference
      if (userPreferences) {
        return userPreferences.dashboard.ticketCreated;
      }
      return true;
    }

    // Check admin settings for specific events
    let adminAllows = false;
    switch (event) {
      case 'assigned':
        adminAllows = adminSettings.dashboard.item.assigned.notifyUser;
        break;
      case 'updated':
        adminAllows = adminSettings.dashboard.item.updated.notifyUser;
        break;
      case 'resolved':
        adminAllows = adminSettings.dashboard.item.resolved.notifyUser;
        break;
      case 'closed':
        adminAllows = adminSettings.dashboard.item.closed.notifyUser;
        break;
      default:
        adminAllows = false;
    }

    if (!adminAllows) return false;

    if (!userPreferences) return true; 

    switch (event) {
      case 'created':
        return userPreferences.dashboard.ticketCreated;
      case 'assigned':
        return userPreferences.dashboard.itemAssigned;
      case 'updated':
        return userPreferences.dashboard.itemUpdated;
      case 'resolved':
      case 'closed':
        return userPreferences.dashboard.itemClosed;
      default:
        return true;
    }
  }

  // ============================================
  // EMAIL NOTIFICATIONS
  // ============================================
  if (channel === 'email') {
    // Check admin settings for "notify all users on new ticket"
    if (event === 'created' && isAllUsers) {
      const adminAllows = adminSettings.email.notifyAllUsersOnNewTicket;
      if (!adminAllows) return false;
      
      // Check user preference if internal user
      if (userPreferences) {
        return userPreferences.email.ticketCreated;
      }
      return true;
    }

    // Check admin settings for specific events
    let adminAllows = false;
    switch (event) {
      case 'created':
        adminAllows = isRequester 
          ? adminSettings.email.item.created.notifyRequester
          : false; // Only requesters get "created" emails
        break;
      case 'assigned':
        adminAllows = isRequester
          ? adminSettings.email.item.assigned.notifyRequester
          : adminSettings.email.item.assigned.notifyUser;
        break;
      case 'updated':
        adminAllows = isRequester
          ? adminSettings.email.item.updated.notifyRequester
          : adminSettings.email.item.updated.notifyUser;
        break;
      case 'resolved':
        adminAllows = isRequester
          ? adminSettings.email.item.resolved.notifyRequester
          : adminSettings.email.item.resolved.notifyUser;
        break;
      case 'closed':
        adminAllows = isRequester
          ? adminSettings.email.item.closed.notifyRequester
          : adminSettings.email.item.closed.notifyUser;
        break;
      default:
        adminAllows = false;
    }

    if (!adminAllows) return false;

    // External users (requesters) - admin setting is enough
    if (isRequester) return true;

    // Admin allows, now check user preferences for internal users
    if (!userPreferences) return false; // Internal user must have preferences

    switch (event) {
      case 'created':
        return userPreferences.email.ticketCreated;
      case 'assigned':
        return userPreferences.email.itemAssigned;
      case 'updated':
        return userPreferences.email.itemUpdated;
      case 'resolved':
      case 'closed':
        return userPreferences.email.itemClosed;
      default:
        return true;
    }
  }

  return false;
}


