import { NotificationPreferences, NotificationSettings } from "../types"

export function shouldSendNotification(
  channel: 'dashboard' | 'email',
  event: 'created' | 'assigned' | 'updated' | 'resolved' | 'closed',
  userRole: 'assignedUser' | 'requester' | 'allUsers',
  userPreferences: NotificationPreferences | null,
  adminSettings: NotificationSettings
): boolean {
  const eventSettings = adminSettings[channel].ticket[event];

  if (userRole === 'requester') {
    if (channel === 'dashboard') return false;
    return 'notifyRequester' in eventSettings ? eventSettings.notifyRequester : false;
  }

  if (!userPreferences) return false;

  const preferenceKeyMap = {
    created: 'ticketCreated',
    assigned: 'itemAssigned',
    updated: 'itemUpdated',
    resolved: 'itemClosed',
    closed: 'itemClosed'
  } as const;

  if (!userPreferences[channel][preferenceKeyMap[event]]) return false;

  if (userRole === 'allUsers') {
    return 'notifyAllUsers' in eventSettings ? eventSettings.notifyAllUsers : false;
  }

  return 'notifyUser' in eventSettings ? eventSettings.notifyUser : false;
}
