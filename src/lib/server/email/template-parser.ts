import Handlebars from 'handlebars';
import {
  requesterTicketNotificationTemplate,
  userTicketNotificationTemplate,
  requesterInfoNotificationTemplate,
  userInfoNotificationTemplate,
  requesterSuccessNotificationTemplate,
  userSuccessNotificationTemplate,
  requesterWarningNotificationTemplate,
  userWarningNotificationTemplate,
  requesterErrorNotificationTemplate,
  userErrorNotificationTemplate,
  requesterSystemNotificationTemplate,
  userSystemNotificationTemplate
} from './templates';
import type { Organization, Status, Ticket, TicketMessage } from '$lib/types';

// Organize templates by type and user type
const templates = {
  ticket: {
    requester: Handlebars.compile(requesterTicketNotificationTemplate),
    user: Handlebars.compile(userTicketNotificationTemplate)
  },
  info: {
    requester: Handlebars.compile(requesterInfoNotificationTemplate),
    user: Handlebars.compile(userInfoNotificationTemplate)
  },
  success: {
    requester: Handlebars.compile(requesterSuccessNotificationTemplate),
    user: Handlebars.compile(userSuccessNotificationTemplate)
  },
  warning: {
    requester: Handlebars.compile(requesterWarningNotificationTemplate),
    user: Handlebars.compile(userWarningNotificationTemplate)
  },
  error: {
    requester: Handlebars.compile(requesterErrorNotificationTemplate),
    user: Handlebars.compile(userErrorNotificationTemplate)
  },
  system: {
    requester: Handlebars.compile(requesterSystemNotificationTemplate),
    user: Handlebars.compile(userSystemNotificationTemplate)
  }
};

export interface NotificationTemplateData {
  ticket: Ticket;
  status?: Status;
  ticketMessage?: TicketMessage;
  title?: string;
  message?: string;
  organization: Organization;
  actionUrl?: string | null;
  unsubscribeLink: string;
  to: string;
  template: 'requester' | 'user';
  type: 'info' | 'success' | 'warning' | 'error' | 'ticket' | 'system';
}

/**
 * Generate email from template
 */
export async function generateTemplate(data: NotificationTemplateData): Promise<string> {
  if (!data.to) {
    throw new Error('Recipient email is required');
  }

  // Validate based on template type
  if (data.type === 'ticket') {
    if (!data.ticket?.ticketNumber || !data.ticket?.subject) {
      throw new Error('Ticket number and subject are required for ticket notifications');
    }
  }

  const compiledTemplate = templates[data.type]?.[data.template];

  if (!compiledTemplate) {
    throw new Error(`Invalid template type: ${data.type} or user type: ${data.template}`);
  }

  // TODO: add attachments if available
  const templateData = {
    // Organization data
    organizationname: data.organization.name,
    organizationaddress: data.organization.address || '',
    organizationcity: data.organization.city || '',
    organizationzipcode: data.organization.zipCode || '',

    // Common data
    title: data.title || data.ticket?.subject || '',
    message: data.message || '',
    actionurl: data.actionUrl || '#',
    unsubscribelink: data.unsubscribeLink,

    // Ticket-specific data (for ticket type templates)
    ticketnumber: data.ticket?.ticketNumber || '',
    tickettitle: data.ticket?.subject || '',
    statusname: data.status?.name || 'Open',

    // Message data (if provided)
    agentname: data.ticketMessage?.senderName || 'Support Team',
    requestername: data.ticketMessage?.hasAttachments || data.ticket?.requester?.email || 'Customer',
    reply: data.ticketMessage?.message || data.message || '',
    replydate: data.ticketMessage?.createdAt
      ? new Date(data.ticketMessage.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
  };

  const html = compiledTemplate(templateData);

  return html;
}
