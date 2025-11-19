import { Notification, User, UserNotification } from "./db/models";
import { Op } from "sequelize";
import { sendEmail } from "./email/email";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NotificationOptions {
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

  // === OPTIONAL METADATA ===
  relatedEntityType?: "ticket" | "user" | "system" | null;
  relatedEntityId?: number | null;
  actionUrl?: string | null;
  createdById?: string | null;        // Who created this notification

  // === EMAIL OPTIONS ===
}

interface NotificationResult {
  success: boolean;
  notificationId: number;
  recipientCount: number;
  recipients: string[];
  error?: string;
}

// ============================================================================
// MAIN NOTIFICATION FUNCTION
// ============================================================================

async function createNotification(options: NotificationOptions): Promise<NotificationResult> {
  try {
    // Validate that at least one recipient option is provided
    if (!options.userId && !options.userIds && !options.allUsers && !options.userFilter) {
      throw new Error("Must specify at least one recipient option: userId, userIds, allUsers, or userFilter");
    }

    // Step 1: Determine recipient user IDs
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

    // Step 2: Create the notification content (stored once)
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

    // Step 3: Create user notification entries (one per recipient)
    const userNotifications = recipientUserIds.map(userId => ({
      notificationId: notification.id,
      userId: userId,
      isRead: false,
      sentViaEmail: false,
    }));

    await UserNotification.bulkCreate(userNotifications);

    if (options.channel === "email") {
      await queueEmailNotifications(notification.id, recipientUserIds);
    }

    return {
      success: true,
      notificationId: notification.id,
      recipientCount: recipientUserIds.length,
      recipients: recipientUserIds,
    };

  } catch (error) {
    console.error("Error creating notification:", error);
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

async function determineRecipients(options: NotificationOptions): Promise<string[]> {
  // Option 1: Single user
  if (options.userId) {
    const user = await User.findByPk(options.userId, { attributes: ['id'] });
    return user ? [user.id] : [];
  }

  // Option 2: Multiple specific users
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

  // Option 3: All users (with optional filter)
  if (options.allUsers || options.userFilter) {
    const whereClause: any = {};

    // Apply user filter if provided
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
      // Default: exclude banned users when getting all users
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
 * Send email notifications immediately (no queue)
 * Good for small batches (< 50 users)
 */
async function queueEmailNotifications(notificationId: number, userIds: string[]): Promise<void> {
  try {
    console.log(`Sending emails for notification ${notificationId} to ${userIds.length} users`);

    // Get notification details
    const notification = await Notification.findByPk(notificationId, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['name']
      }]
    });

    if (!notification) {
      console.error(`Notification ${notificationId} not found`);
      return;
    }

    // Get user details
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'email', 'name']
    });

    // Send emails to each user
    for (const user of users) {
      try {
        // Generate email HTML
        const emailHtml = ''//generateNotificationEmail(notification, user);
        const emailText = ''//generateNotificationEmailText(notification, user);

        // Send email
        await sendEmail(
          user.email,
          notification.title,
          emailHtml,
          emailText
        );

        // Mark email as sent
        await markEmailAsSent(notificationId, user.id, null);

        console.log(`✅ Email sent to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${user.email}:`, error);

        // Mark email as failed with error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await markEmailAsSent(notificationId, user.id, errorMessage);
      }
    }

    console.log(`Completed sending ${users.length} emails for notification ${notificationId}`);
  } catch (error) {
    console.error('Error in queueEmailNotifications:', error);
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

export async function notificationExamples() {

  // Example 1: Notify single user - ticket assignment (email)
  await createNotification({
    title: "New Ticket Assigned",
    message: "You have been assigned to ticket #12345",
    userId: "user-abc-123",
    type: "ticket",
    channel: "email",
    relatedEntityType: "ticket",
    relatedEntityId: 12345,
    actionUrl: "/tickets/12345",
    createdById: "admin-xyz-789",
  });

  // Example 2: Notify multiple users - team notification (dashboard)
  await createNotification({
    title: "Team Meeting Tomorrow",
    message: "Don't forget our sprint planning meeting at 10 AM",
    userIds: ["user-1", "user-2", "user-3", "user-4"],
    type: "info",
    channel: "dashboard",
    createdById: "manager-123"
  });

  // Example 3: Notify all users - system announcement (email)
  await createNotification({
    title: "Scheduled Maintenance",
    message: "System will be down Sunday 2-4 AM for maintenance",
    allUsers: true,
    type: "warning",
    channel: "email",
    relatedEntityType: "system",
  });

  // Example 4: Notify users with filter - only admins (dashboard)
  await createNotification({
    title: "Admin: New Feature Available",
    message: "Check out the new admin dashboard features",
    userFilter: {
      role: "admin",
      banned: false
    },
    type: "success",
    channel: "dashboard"
  });

  // Example 5: Notify verified users only (dashboard)
  await createNotification({
    title: "Complete Your Profile",
    message: "Please update your profile information",
    userFilter: {
      emailVerified: true,
      banned: false
    },
    type: "info",
    channel: "dashboard"
  });

  // Example 6: Dashboard only notification (no email)
  await createNotification({
    title: "New Comment on Your Ticket",
    message: "John Doe commented on ticket #98765",
    userId: "user-abc-123",
    type: "info",
    channel: "dashboard", // Dashboard notification
    relatedEntityType: "ticket",
    relatedEntityId: 98765,
    actionUrl: "/tickets/98765#comment-456"
  });

  // Example 7: Email only notification (no dashboard)
  await createNotification({
    title: "Weekly Report Ready",
    message: "Your weekly ticket summary is attached",
    userId: "user-abc-123",
    type: "info",
    channel: "email", // Email only
  });

  // Example 8: Urgent notification to all admins (email)
  await createNotification({
    title: "URGENT: System Error Detected",
    message: "Critical error in payment processing system requires immediate attention",
    userFilter: {
      role: "admin",
      banned: false
    },
    type: "error",
    channel: "email",
    relatedEntityType: "system",
  });

  // Example 9: Ticket status change notification (dashboard)
  const ticketId = 12345;
  const assignedUserId = "user-abc-123";
  await createNotification({
    title: "Ticket Resolved",
    message: `Ticket #${ticketId} has been marked as resolved`,
    userId: assignedUserId,
    type: "success",
    channel: "dashboard",
    relatedEntityType: "ticket",
    relatedEntityId: ticketId,
    actionUrl: `/tickets/${ticketId}`,
    createdById: "support-agent-456"
  });

  // Example 10: Bulk notification with result handling (email)
  const result = await createNotification({
    title: "New Policy Update",
    message: "Please review the updated company policies",
    allUsers: true,
    type: "info",
    channel: "email",
    actionUrl: "/policies",
  });

  if (result.success) {
    console.log(`✅ Notification sent to ${result.recipientCount} users`);
    console.log(`Notification ID: ${result.notificationId}`);
  } else {
    console.error(`❌ Failed to send notification: ${result.error}`);
  }
}

// ============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================================================

/**
 * Mark notification as read for a specific user
 */
async function markNotificationAsRead(userId: string, notificationId: number): Promise<boolean> {
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
async function markAllNotificationsAsRead(userId: string): Promise<number> {
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
async function getUnreadNotifications(userId: string, limit: number = 50) {
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
async function getUserNotifications(
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
async function getNotificationCount(userId: string, unreadOnly: boolean = true) {
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
async function deleteUserNotification(userId: string, notificationId: number): Promise<boolean> {
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
async function deleteReadNotifications(userId: string): Promise<number> {
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
async function markEmailAsSent(
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
async function getUsersWithPendingEmails(notificationId: number): Promise<string[]> {
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
async function resendNotification(
  notificationId: number,
  userIds: string[]
): Promise<NotificationResult> {
  try {
    // Check if notification exists
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

    // Recreate user notifications
    const userNotifications = userIds.map(userId => ({
      notificationId: notificationId,
      userId: userId,
      isRead: false,
      sentViaEmail: false
    }));

    await UserNotification.bulkCreate(userNotifications);

    // Queue emails if email channel is enabled
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

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotifications,
  getUserNotifications,
  getNotificationCount,
  deleteUserNotification,
  deleteReadNotifications,
  markEmailAsSent,
  getUsersWithPendingEmails,
  resendNotification,
  type NotificationOptions,
  type NotificationResult
};
