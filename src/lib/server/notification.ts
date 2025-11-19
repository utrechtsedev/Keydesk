// notification.ts
import { Notification, User, UserNotification } from "./db/models";
import { Op } from "sequelize";
import { enqueueEmail, enqueueBatchEmail, isQueueAvailable } from "./job-queue";
import { sendEmail } from "./email/email";
import { generateTemplate, type NotificationData } from "./email/template";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NotificationOptions {
  // === REQUIRED ===
  title: string;
  message: string;

  // === RECIPIENTS (choose one) ===
  userId?: string;                    // Single user
  userIds?: string[];                 // Multiple specific users
  allUsers?: boolean;                 // All users in system
  userFilter?: {                      // Custom user filter
    role?: string;
    emailVerified?: boolean;
    banned?: boolean;
  };

  // === NOTIFICATION SETTINGS ===
  type?: "info" | "success" | "warning" | "error" | "ticket" | "system";
  channel?: "dashboard" | "email";  // Default: "dashboard"

  relatedEntityType?: "ticket" | "user" | "system" | null;
  relatedEntityId?: number | null;
  actionUrl?: string | null;
  createdById?: string | null;

  // === EMAIL TEMPLATE DATA (optional) ===
  templateData?: Partial<NotificationData>;
}

export interface NotificationResult {
  success: boolean;
  notificationId: number;
  recipientCount: number;
  recipients: string[];
  error?: string;
}

// ============================================================================
// MAIN NOTIFICATION FUNCTION
// ============================================================================

export async function createNotification(options: NotificationOptions): Promise<NotificationResult> {
  try {
    // Validate recipients
    if (!options.userId && !options.userIds && !options.allUsers && !options.userFilter) {
      throw new Error("Must specify at least one recipient option: userId, userIds, allUsers, or userFilter");
    }

    // Determine recipients
    const recipientUserIds = await determineRecipients(options);

    if (recipientUserIds.length === 0) {
      return {
        success: false,
        notificationId: 0,
        recipientCount: 0,
        recipients: [],
        error: "No valid recipients found"
      };
    }

    // Create notification record
    const notification = await Notification.create({
      title: options.title,
      message: options.message,
      type: options.type || "info",
      channel: options.channel || "dashboard",
      relatedEntityType: options.relatedEntityType || null,
      relatedEntityId: options.relatedEntityId || null,
      actionUrl: options.actionUrl || null,
      createdById: options.createdById || null,
    });

    // Create user notification records
    const userNotifications = recipientUserIds.map(userId => ({
      notificationId: notification.id,
      userId: userId,
      isRead: false,
      sentViaEmail: false,
    }));

    await UserNotification.bulkCreate(userNotifications);

    // Handle email sending if channel is email
    if (options.channel === "email") {
      await queueEmailNotifications(
        notification.id,
        recipientUserIds,
        options.templateData
      );
    }

    return {
      success: true,
      notificationId: notification.id,
      recipientCount: recipientUserIds.length,
      recipients: recipientUserIds,
    };

  } catch (error) {
    console.error("❌ Error creating notification:", error);
    return {
      success: false,
      notificationId: 0,
      recipientCount: 0,
      recipients: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine recipients based on options
 */
async function determineRecipients(options: NotificationOptions): Promise<string[]> {
  // Single user
  if (options.userId) {
    const user = await User.findByPk(options.userId, { attributes: ['id'] });
    return user ? [user.id] : [];
  }

  // Multiple specific users
  if (options.userIds && options.userIds.length > 0) {
    const users = await User.findAll({
      attributes: ['id'],
      where: {
        id: {
          [Op.in]: options.userIds
        }
      }
    });
    return users.map(u => u.id);
  }

  // All users or filtered users
  if (options.allUsers || options.userFilter) {
    const whereClause: any = {};

    if (options.userFilter) {
      if (options.userFilter.role !== undefined) {
        whereClause.role = options.userFilter.role;
      }
      if (options.userFilter.emailVerified !== undefined) {
        whereClause.emailVerified = options.userFilter.emailVerified;
      }
      if (options.userFilter.banned !== undefined) {
        whereClause.banned = options.userFilter.banned;
      }
    } else {
      // Default: exclude banned users when sending to all
      whereClause.banned = false;
    }

    const users = await User.findAll({
      attributes: ['id'],
      where: whereClause
    });

    return users.map(u => u.id);
  }

  return [];
}

/**
 * Queue or send email notifications
 * Uses queue if available, otherwise sends directly
 */
async function queueEmailNotifications(
  notificationId: number,
  userIds: string[],
  templateData?: Partial<NotificationData>
): Promise<void> {
  const userCount = userIds.length;
  const useQueue = isQueueAvailable();

  console.log(`📧 Sending emails for notification ${notificationId} to ${userCount} user(s)`);

  // For large batches, use batch processing
  if (userCount > 50) {
    console.log(`📦 Using batch processing for ${userCount} emails`);

    if (useQueue) {
      // Queue batch job
      await enqueueBatchEmail({
        notificationId,
        userIds,
        templateData,
        batchSize: 10
      });
    } else {
      // Execute batch directly
      await sendBatchEmailsDirect(notificationId, userIds, templateData);
    }
    return;
  }

  // For small batches, process individually
  if (useQueue) {
    // Queue individual emails
    for (const userId of userIds) {
      await enqueueEmail({
        notificationId,
        userId,
        templateData
      });
    }
    console.log(`✅ Queued ${userCount} email job(s)`);
  } else {
    // Send emails directly
    await sendEmailsDirect(notificationId, userIds, templateData);
  }
}

/**
 * Send emails directly (no queue)
 * Used when Redis is not available
 */
async function sendEmailsDirect(
  notificationId: number,
  userIds: string[],
  templateData?: Partial<NotificationData>
): Promise<void> {
  console.log(`⚡ Sending ${userIds.length} emails directly (no queue)`);

  const notification = await Notification.findByPk(notificationId);
  if (!notification) {
    console.error(`Notification ${notificationId} not found`);
    return;
  }

  const users = await User.findAll({
    where: { id: userIds },
    attributes: ['id', 'email', 'name']
  });

  for (const user of users) {
    try {
      if (!user.email) {
        throw new Error('User has no email');
      }

      let emailHtml: string;

      if (templateData) {
        emailHtml = await generateTemplate({
          ...templateData as NotificationData,
          to: user.email
        });
      } else {
        emailHtml = generateSimpleNotificationEmail(notification, user);
      }

      await sendEmail(user.email, notification.title, emailHtml);
      await markEmailAsSent(notificationId, user.id, null);

      console.log(`  ✅ Email sent to ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Failed to send email to ${user.email}:`, errorMessage);
      await markEmailAsSent(notificationId, user.id, errorMessage);
    }
  }

  console.log(`✅ Completed sending ${users.length} emails directly`);
}

/**
 * Send batch emails directly (no queue)
 * Used when Redis is not available but batch is large
 */
async function sendBatchEmailsDirect(
  notificationId: number,
  userIds: string[],
  templateData?: Partial<NotificationData>,
  batchSize: number = 10
): Promise<void> {
  console.log(`📦 Processing ${userIds.length} emails in batches of ${batchSize}`);

  const notification = await Notification.findByPk(notificationId);
  if (!notification) {
    console.error(`Notification ${notificationId} not found`);
    return;
  }

  // Process in batches
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const users = await User.findAll({
      where: { id: batch },
      attributes: ['id', 'email', 'name']
    });

    await Promise.allSettled(
      users.map(async (user) => {
        try {
          if (!user.email) {
            throw new Error('User has no email');
          }

          let emailHtml: string;

          if (templateData) {
            emailHtml = await generateTemplate({
              ...templateData as NotificationData,
              to: user.email
            });
          } else {
            emailHtml = generateSimpleNotificationEmail(notification, user);
          }

          await sendEmail(user.email, notification.title, emailHtml);
          await markEmailAsSent(notificationId, user.id, null);

          console.log(`  ✅ Email sent to ${user.email}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`  ❌ Failed to send email to ${user.email}:`, errorMessage);
          await markEmailAsSent(notificationId, user.id, errorMessage);
        }
      })
    );

    // Small delay between batches
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Batch email processing complete`);
}

/**
 * Generate simple HTML email (fallback)
 */
function generateSimpleNotificationEmail(
  notification: Notification,
  user: User
): string {
  const escapeHtml = (text: string) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(notification.title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                ${escapeHtml(notification.title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${escapeHtml(user.name || 'there')},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                ${escapeHtml(notification.message)}
              </p>
              ${notification.actionUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td style="border-radius: 4px; background-color: #0066cc;">
                    <a href="${notification.actionUrl}" 
                       style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Details
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mark notification as read for a specific user
 */
export async function markNotificationAsRead(userId: string, notificationId: number): Promise<boolean> {
  try {
    const [updated] = await UserNotification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          userId: userId,
          notificationId: notificationId
        }
      }
    );
    return updated > 0;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  try {
    const [updated] = await UserNotification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          userId: userId,
          isRead: false
        }
      }
    );
    return updated;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return 0;
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string, limit: number = 50) {
  try {
    return await UserNotification.findAll({
      where: {
        userId: userId,
        isRead: false
      },
      include: [{
        model: Notification,
        as: 'notification',
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'image']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: limit
    });
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return [];
  }
}

/**
 * Get all notifications for a user (with pagination)
 */
export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20,
  includeRead: boolean = true
) {
  try {
    const offset = (page - 1) * limit;
    const whereClause: any = { userId };

    if (!includeRead) {
      whereClause.isRead = false;
    }

    const { rows, count } = await UserNotification.findAndCountAll({
      where: whereClause,
      include: [{
        model: Notification,
        as: 'notification',
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'image']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    return {
      notifications: rows,
      total: count,
      page: page,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count
    };
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return {
      notifications: [],
      total: 0,
      page: 1,
      totalPages: 0,
      hasMore: false
    };
  }
}

/**
 * Get notification count for a user
 */
export async function getNotificationCount(userId: string, unreadOnly: boolean = true) {
  try {
    const whereClause: any = { userId };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    return await UserNotification.count({
      where: whereClause
    });
  } catch (error) {
    console.error("Error getting notification count:", error);
    return 0;
  }
}

/**
 * Delete notification for a specific user (soft delete)
 */
export async function deleteUserNotification(userId: string, notificationId: number): Promise<boolean> {
  try {
    const deleted = await UserNotification.destroy({
      where: {
        userId: userId,
        notificationId: notificationId
      }
    });
    return deleted > 0;
  } catch (error) {
    console.error("Error deleting user notification:", error);
    return false;
  }
}

/**
 * Delete all read notifications for a user
 */
export async function deleteReadNotifications(userId: string): Promise<number> {
  try {
    return await UserNotification.destroy({
      where: {
        userId: userId,
        isRead: true
      }
    });
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return 0;
  }
}

/**
 * Update email sent status
 */
export async function markEmailAsSent(
  notificationId: number,
  userId: string,
  error: string | null = null
): Promise<boolean> {
  try {
    const [updated] = await UserNotification.update(
      {
        sentViaEmail: error === null,
        emailSentAt: error === null ? new Date() : null,
        emailError: error
      },
      {
        where: {
          notificationId: notificationId,
          userId: userId
        }
      }
    );
    return updated > 0;
  } catch (error) {
    console.error("Error updating email status:", error);
    return false;
  }
}

/**
 * Get users who haven't received email for a notification
 */
export async function getUsersWithPendingEmails(notificationId: number): Promise<string[]> {
  try {
    const notification = await Notification.findByPk(notificationId);

    if (!notification || notification.channel !== 'email') {
      return [];
    }

    const pendingUsers = await UserNotification.findAll({
      where: {
        notificationId: notificationId,
        sentViaEmail: false,
        emailError: null
      },
      attributes: ['userId']
    });

    return pendingUsers.map(un => un.userId);
  } catch (error) {
    console.error("Error getting users with pending emails:", error);
    return [];
  }
}

/**
 * Resend notification to specific users
 */
export async function resendNotification(
  notificationId: number,
  userIds: string[]
): Promise<NotificationResult> {
  try {
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return {
        success: false,
        notificationId: 0,
        recipientCount: 0,
        recipients: [],
        error: "Notification not found"
      };
    }

    // Delete existing user notifications for these users
    await UserNotification.destroy({
      where: {
        notificationId: notificationId,
        userId: {
          [Op.in]: userIds
        }
      }
    });

    // Create new user notification records
    const userNotifications = userIds.map(userId => ({
      notificationId: notificationId,
      userId: userId,
      isRead: false,
      sentViaEmail: false
    }));

    await UserNotification.bulkCreate(userNotifications);

    // Queue emails if channel is email
    if (notification.channel === 'email') {
      await queueEmailNotifications(notificationId, userIds);
    }

    return {
      success: true,
      notificationId: notificationId,
      recipientCount: userIds.length,
      recipients: userIds
    };
  } catch (error) {
    console.error("Error resending notification:", error);
    return {
      success: false,
      notificationId: 0,
      recipientCount: 0,
      recipients: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
