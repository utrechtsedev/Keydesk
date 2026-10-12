import { render } from 'svelte/server';
import type { Component } from 'svelte';
import type { NotificationOptions } from '#lib/types/index.js';
import { escapeHtml } from '#lib/server/html.js';
import Message from './templates/Message.svelte';
import TaskNotification from './templates/TaskNotification.svelte';
import TicketNotification from './templates/TicketNotification.svelte';

/** What an email shows of the organization it comes from */
export interface EmailOrganization {
	name: string;
	address: string;
	city: string;
	zipCode: string;
	/** Dates in emails are shown in the organization's time zone, not the server's */
	timezone: string;
}

export interface Email {
	subject: string;
	html: string;
	text: string;
}

/** Mail clients ignore the page's stylesheet in places; the templates style inline, this covers the rest */
const styles = `
	body { margin: 0; padding: 0; min-width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
	table { border-spacing: 0; border-collapse: collapse; }
	td { padding: 0; }
	img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
	#MessageViewBody a, #MessageWebViewDiv a { color: inherit; text-decoration: none; }
	a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
	@media only screen and (max-width: 600px) {
		.mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
	}
`;

/**
 * Renders an email template into a complete HTML document. Svelte renders the body; the document
 * around it holds what a component can't, such as Outlook's conditional comments.
 */
function renderDocument<Props extends Record<string, unknown>>(
	title: string,
	template: Component<Props>,
	props: Props
): string {
	const { body } = render(template, { props });
	// Svelte marks blocks with comments for hydration, which mean nothing in an email. The body
	// holds no other comments: everything the templates show is escaped text.
	const content = body.replace(/<!--[\s\S]*?-->/g, '');

	return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>${styles}</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;">
${content}
</body>
</html>`;
}

function plainText(...paragraphs: (string | undefined)[]): string {
	return paragraphs.filter((paragraph) => paragraph).join('\n\n');
}

function formatDate(date: Date | string | undefined, timeZone: string): string {
	if (!date) return '';
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone
	});
}

/** An email with a title, a message and one button, such as an invitation or a sign-in link */
export function messageEmail(content: {
	organization: EmailOrganization;
	subject: string;
	title: string;
	message: string;
	action: { label: string; url: string };
	footer: string;
}): Email {
	const { organization, subject, title, message, action, footer } = content;
	return {
		subject,
		html: renderDocument(title, Message, { organization, title, message, action, footer }),
		text: plainText(title, message, `${action.label}: ${action.url}`, footer)
	};
}

/** The email for a notification, shaped by what it is about: a ticket, a task or the system */
export function notificationEmail(
	options: NotificationOptions,
	organization: EmailOrganization,
	actionUrl: string
): Email {
	const { title, message } = options;
	const { notification } = options;

	if (notification.type === 'entity' && notification.entity.type === 'ticket') {
		const ticket = notification.entity.data;
		const details = {
			number: String(ticket.ticketNumber),
			subject: ticket.subject,
			status: ticket.status?.name || 'Open',
			createdAt: formatDate(ticket.createdAt, organization.timezone)
		};
		return {
			subject: title,
			html: renderDocument(title, TicketNotification, {
				organization,
				title,
				message,
				actionUrl,
				ticket: details
			}),
			text: plainText(
				`Ticket ${details.number}: ${details.subject} (${details.status})`,
				title,
				message,
				`View the ticket: ${actionUrl}`,
				'You can reply directly to this email to continue the conversation.'
			)
		};
	}

	if (notification.type === 'entity' && notification.entity.type === 'task') {
		const task = notification.entity.data;
		const details = {
			title: task.title,
			status: task.status?.name || 'pending',
			assignedTo: task.assignee?.name || 'Unassigned',
			dueDate: task.dueDate ? formatDate(task.dueDate, organization.timezone) : 'Not set'
		};
		return {
			subject: title,
			html: renderDocument(title, TaskNotification, {
				organization,
				title,
				message,
				actionUrl,
				task: details
			}),
			text: plainText(
				`Task: ${details.title} (${details.status}, due ${details.dueDate})`,
				title,
				message,
				`View the task: ${actionUrl}`
			)
		};
	}

	return messageEmail({
		organization,
		subject: title,
		title,
		message,
		action: { label: 'View Details', url: actionUrl },
		footer: "You're receiving this notification from us."
	});
}
