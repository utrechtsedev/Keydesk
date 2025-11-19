import { sendEmail } from '../../email/email';
import { generateTemplate } from '../../email/template';
import { User, Notification } from '../../db/models';
import { markEmailAsSent } from '../../notification';
import type { NotificationRequestData } from '$lib/types';

// ============================================================================
// SINGLE EMAIL HANDLER
// ============================================================================

interface SendEmailJobData {
  notificationId: number;
  userId: string;
  templateData?: NotificationRequestData;
}

/**
 * Handler for sending individual emails
 */
export async function handleSendEmail(data: SendEmailJobData): Promise<void> {
  const { notificationId, userId, templateData } = data;

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name']
    });

    if (!user || !user.email) {
      throw new Error(`User ${userId} not found or has no email`);
    }

    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    let emailHtml: string;

    // If template data provided, generate from template
    if (templateData) {
      emailHtml = await generateTemplate({
        ...templateData,
        to: user.email
      });
    } else {
      // Generate simple HTML email from notification
      emailHtml = generateSimpleNotificationEmail(notification, user);
    }

    // Send email
    await sendEmail(
      user.email,
      notification.title,
      emailHtml
    );

    // Mark as sent
    await markEmailAsSent(notificationId, userId, null);

    console.log(`✅ Email sent to ${user.email} for notification ${notificationId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to send email to user ${userId}:`, errorMessage);

    // Mark as failed
    await markEmailAsSent(notificationId, userId, errorMessage);

    throw error;
  }
}

// ============================================================================
// BATCH EMAIL HANDLER
// ============================================================================

interface SendBatchEmailJobData {
  notificationId: number;
  userIds: string[];
  templateData?: Partial<NotificationRequestData>;
  batchSize?: number;
}

/**
 * Handler for sending batch emails
 * Processes in chunks to avoid overwhelming the email service
 */
export async function handleSendBatchEmail(data: SendBatchEmailJobData): Promise<void> {
  const { notificationId, userIds, templateData, batchSize = 10 } = data;

  console.log(`📧 Processing batch email for ${userIds.length} users`);

  const notification = await Notification.findByPk(notificationId);
  if (!notification) {
    throw new Error(`Notification ${notificationId} not found`);
  }

  // Process in batches
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const users = await User.findAll({
      where: { id: batch },
      attributes: ['id', 'email', 'name']
    });

    // Process each user in the batch
    await Promise.allSettled(
      users.map(async (user) => {
        try {
          if (!user.email) {
            throw new Error('User has no email');
          }

          let emailHtml: string;

          if (templateData) {
            emailHtml = await generateTemplate({
              ...templateData as NotificationRequestData,
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

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Batch email processing complete for notification ${notificationId}`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate simple HTML email from notification data
 * Fallback when no custom template is provided
 */
function generateSimpleNotificationEmail(
  notification: Notification,
  user: User
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                ${escapeHtml(notification.title)}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
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
          
          <!-- Footer -->
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

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
