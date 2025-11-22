import { registerJobHandler } from '../index';
import { handleSendNotification } from './notification.handler';

/**
 * Register all job handlers
 * Call this during app initialization
 */
export function registerAllHandlers(): void {
  registerJobHandler('send-notification', handleSendNotification);

  console.log('✅ All job handlers registered');
}
