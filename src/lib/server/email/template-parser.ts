import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { NotificationOptions, Organization } from '$lib/types';

// Template directory path
const templateDir = join(process.cwd(), 'src/lib/server/email/templates');

// Load and register the layout partial
const layoutTemplate = readFileSync(join(templateDir, '_layout.hbs'), 'utf-8');
Handlebars.registerPartial('layout', layoutTemplate);

// Load and compile templates
const templates = {
	ticket: Handlebars.compile(readFileSync(join(templateDir, 'ticket.hbs'), 'utf-8')),
	task: Handlebars.compile(readFileSync(join(templateDir, 'task.hbs'), 'utf-8')),
	system: Handlebars.compile(readFileSync(join(templateDir, 'system.hbs'), 'utf-8'))
};

export interface EmailTemplateData {
	options: NotificationOptions;
	organization: Organization;
	recipientEmail: string;
	actionUrl?: string;
}

/**
 * Generate email HTML from template
 */
export function generateEmailTemplate(data: EmailTemplateData): string {
	const { options, organization, recipientEmail, actionUrl } = data;

	const templateType = getTemplateType(options);
	const compiledTemplate = templates[templateType];

	if (!compiledTemplate) {
		throw new Error(`Template not found for type: ${templateType}`);
	}

	const templateData = {
		// Organization info
		organizationName: organization.name,
		organizationAddress: organization.address || '',
		organizationCity: organization.city || '',
		organizationZipCode: organization.zipCode || '',

		// Common notification data
		title: options.title,
		message: options.message,
		actionUrl: actionUrl || '#',
		recipientEmail: recipientEmail,

		// Subtitle for specific templates
		subtitle: getSubtitle(templateType),

		// Footer text
		footerText: getFooterText(options),

		// Entity-specific data
		...getEntityData(options),

		// Metadata
		notificationType:
			options.notification.type === 'entity'
				? options.notification.entity.type
				: options.notification.type,
		eventType: options.notification.event
	};

	return compiledTemplate(templateData);
}

/**
 * Determine which template to use based on notification options
 */
function getTemplateType(options: NotificationOptions): 'ticket' | 'task' | 'system' {
	if (options.notification.type === 'entity') {
		return options.notification.entity.type;
	}
	return 'system';
}

/**
 * Get subtitle for template header
 */
function getSubtitle(templateType: 'ticket' | 'task' | 'system'): string | undefined {
	if (templateType === 'task') return 'Task Notification';
	return undefined;
}

/**
 * Get footer text based on notification type
 */
function getFooterText(options: NotificationOptions): string {
	if (options.notification.type === 'entity') {
		const entityType = options.notification.entity.type;
		if (entityType === 'ticket') {
			return "You're receiving this email because you're involved with this ticket.";
		}
		if (entityType === 'task') {
			return "You're receiving this because you're assigned to this task.";
		}
	}
	return "You're receiving this notification from us.";
}

/**
 * Extract entity-specific data for templates
 */
function getEntityData(options: NotificationOptions) {
	if (options.notification.type !== 'entity') {
		return {};
	}

	const { entity } = options.notification;

	if (entity.type === 'ticket') {
		const ticket = entity.data;
		return {
			ticketNumber: ticket.ticketNumber,
			ticketSubject: ticket.subject,
			ticketStatus: ticket.status?.name || 'Open',
			requesterName: ticket.requester?.name || ticket.requester?.email || 'Customer',
			assignedTo: ticket.assignee?.name || 'Unassigned',
			priority: ticket.priority?.name || 'Medium',
			createdAt: formatDate(ticket.createdAt)
		};
	}

	if (entity.type === 'task') {
		const task = entity.data;
		return {
			taskTitle: task.title,
			taskDescription: task.description || '',
			taskStatus: task.status?.name || 'pending',
			assignedTo: task.assignee?.name || 'Unassigned', // Changed from assignee
			dueDate: task.dueDate ? formatDate(task.dueDate) : 'Not set',
			createdAt: formatDate(task.createdAt)
		};
	}

	return {};
}

/**
 * Format date consistently
 */
function formatDate(date: Date | string | undefined): string {
	if (!date) return '';

	const dateObj = typeof date === 'string' ? new Date(date) : date;

	return dateObj.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}
