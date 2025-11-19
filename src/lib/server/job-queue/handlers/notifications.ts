import { createNotification, type NotificationOptions } from '../../notification';

/**
 * Handler for sending notifications
 * This is called by the queue worker or executed directly
 */
export async function handleSendNotification(data: NotificationOptions): Promise<void> {
  try {
    const result = await createNotification(data);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create notification');
    }

    console.log(`✅ Notification sent to ${result.recipientCount} user(s)`);
  } catch (error) {
    console.error('❌ Error in handleSendNotification:', error);
    throw error;
  }
}
