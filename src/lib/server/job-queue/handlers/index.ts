import { registerJobHandler } from '../index';
import { handleSendNotification } from './notifications';
import { handleSendEmail, handleSendBatchEmail } from './emails';

/**
 * Register all job handlers
 * Call this during app initialization
 */
export function registerAllHandlers(): void {
  registerJobHandler('send-notification', handleSendNotification);
  registerJobHandler('send-email', handleSendEmail);
  registerJobHandler('send-batch-email', handleSendBatchEmail);

  console.log('✅ All job handlers registered');
}
