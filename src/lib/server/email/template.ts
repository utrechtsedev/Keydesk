import Handlebars from 'handlebars';
import { requesterNotificationEmailTemplate, userNotificationEmailTemplate } from './templates';
import type { NotificationRequestData } from '$lib/types';

const templates = {
  requester: Handlebars.compile(requesterNotificationEmailTemplate),
  user: Handlebars.compile(userNotificationEmailTemplate)
};


/**
 * Generate email from template
 */
export async function generateTemplate(data: NotificationRequestData): Promise<string> {
  if (!data.to) {
    throw new Error('Recipient email is required');
  }

  if (!data.ticket.ticketNumber || !data.ticket.subject) {
    throw new Error('Ticket number and title are required');
  }

  const compiledTemplate = templates[data.template];

  if (!compiledTemplate) {
    throw new Error(`Invalid template type: ${data.template}`);
  }

  const html = compiledTemplate({
    ticket: data.ticket,
    status: data.status,
    ticketMessage: data.ticketMessage,
    organization: data.organization,
    actionurl: data.actionUrl,
    unsubscribelink: data.unsubscribeLink
  });

  return html
}
