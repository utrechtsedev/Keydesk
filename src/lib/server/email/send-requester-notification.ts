import Handlebars from 'handlebars';
import { sendEmail } from './email';
import RequesterNotificationTemplate from './templates/requester-notification.html?raw'

const compiledTemplate = Handlebars.compile(RequesterNotificationTemplate);

/**
 * Parse template and send ticket response email
 */
export async function sendTicketResponse(data: {
  ticketNumber: string;
  ticketTitle: string;
  statusName: string;
  agentName: string;
  replyDate: Date;
  reply: string;
  actionUrl: string;
  organizationName: string;
  organizationAddress: string;
  organizationCity: string;
  organizationZipcode: string;
  unsubscribeLink: string;
  to: string;
}): Promise<void> {
  const html = compiledTemplate({
    ticketnumber: data.ticketNumber,
    tickettitle: data.ticketTitle,
    statusname: data.statusName,
    agentname: data.agentName,
    replydate: data.replyDate,
    reply: data.reply,
    actionurl: data.actionUrl,
    organizationname: data.organizationName,
    organizationaddress: data.organizationAddress,
    organizationcity: data.organizationCity,
    organizationzipcode: data.organizationZipcode,
    unsubscribelink: data.unsubscribeLink
  });

  await sendEmail(
    data.to,
    `Re: Ticket #${data.ticketNumber} - ${data.ticketTitle}`,
    html
  );
}
