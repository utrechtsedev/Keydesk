import type { Organization, Status, Ticket, TicketMessage } from "./core";

export interface NotificationRequestData {
  ticket: Ticket
  status: Status
  ticketMessage: TicketMessage
  organization: Organization
  actionUrl?: string;
  unsubscribeLink: string;
  to: string;
  template: 'requester' | 'user';
}

