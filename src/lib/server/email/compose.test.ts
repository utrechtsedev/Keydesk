import { describe, expect, it } from 'vitest';
import type { NotificationOptions, Task, Ticket } from '#lib/types/index.js';
import { messageEmail, notificationEmail } from './compose.js';

const organization = {
	name: 'Klant & Zonen',
	address: 'Oudegracht 1',
	city: 'Utrecht',
	zipCode: '3511 AA',
	timezone: 'Europe/Amsterdam'
};

function ticketNotification(subject: string): NotificationOptions {
	return {
		title: 'New reply',
		message: 'The customer wrote <b>back</b>',
		recipient: { email: 'agent@example.com' },
		channels: ['email'],
		notification: {
			type: 'entity',
			event: 'updated',
			entity: {
				type: 'ticket',
				data: {
					ticketNumber: 42,
					subject,
					status: { name: 'Open' },
					createdAt: new Date('2026-10-12T09:30:00Z')
				} as Ticket
			}
		}
	} as NotificationOptions;
}

describe('messageEmail', () => {
	const email = messageEmail({
		organization,
		subject: 'Join Klant & Zonen',
		title: 'Join <Klant & Zonen>',
		message: 'Hi "Jan", set your password.',
		action: { label: 'Set your password', url: 'https://keydesk.test/invitation/abc?x=1&y=2' },
		footer: 'You were invited.'
	});

	it('is a complete HTML document', () => {
		expect(email.html).toMatch(/^<!DOCTYPE html>/);
		expect(email.html).toContain('<title>Join &lt;Klant &amp; Zonen&gt;</title>');
		expect(email.html).toContain('<!--[if mso]>');
	});

	it('escapes what it shows', () => {
		expect(email.html).toContain(
			'<h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #0f172a;">Join &lt;Klant &amp; Zonen></h2>'
		);
		expect(email.html).toContain('Hi "Jan", set your password.');
		expect(email.html).toContain('href="https://keydesk.test/invitation/abc?x=1&amp;y=2"');
		expect(email.html).not.toContain('<Klant');
	});

	it('leaves out Svelte hydration markers', () => {
		const body = email.html.slice(email.html.indexOf('<body'));
		expect(body).not.toContain('<!--');
	});

	it('shows the organization in the footer', () => {
		expect(email.html).toContain('Oudegracht 1');
		expect(email.html).toContain('3511 AA');
	});

	it('has a plain text version with the link', () => {
		expect(email.text).toBe(
			[
				'Join <Klant & Zonen>',
				'Hi "Jan", set your password.',
				'Set your password: https://keydesk.test/invitation/abc?x=1&y=2',
				'You were invited.'
			].join('\n\n')
		);
	});
});

describe('notificationEmail', () => {
	it('shows a ticket with its number, subject and status', () => {
		const email = notificationEmail(
			ticketNotification('Printer <on fire>'),
			organization,
			'https://keydesk.test/dashboard/tickets/7'
		);

		expect(email.subject).toBe('New reply');
		expect(email.html).toContain('Printer &lt;on fire>');
		// In the organization's time zone: 09:30 UTC is 11:30 in Utrecht
		expect(email.html).toContain('October 12, 2026 at 11:30 AM');
		expect(email.html).toContain('The customer wrote &lt;b>back&lt;/b>');
		expect(email.html).toContain('View Ticket');
		expect(email.html).toContain('href="https://keydesk.test/dashboard/tickets/7"');
		expect(email.text).toContain('Ticket 42: Printer <on fire> (Open)');
		expect(email.text).toContain('View the ticket: https://keydesk.test/dashboard/tickets/7');
	});

	it('shows a task with its assignee and due date', () => {
		const options = {
			...ticketNotification('unused'),
			notification: {
				type: 'entity',
				event: 'assigned',
				entity: {
					type: 'task',
					data: {
						title: 'Replace toner',
						status: { name: 'In progress' },
						assignee: { name: 'Sanne' },
						dueDate: new Date('2026-10-20T12:00:00Z')
					} as Task
				}
			}
		} as NotificationOptions;

		const email = notificationEmail(
			options,
			organization,
			'https://keydesk.test/dashboard/tasks/3'
		);

		expect(email.html).toContain('Task Notification');
		expect(email.html).toContain('Replace toner');
		expect(email.html).toContain('Sanne');
		expect(email.html).toContain('View Task');
		expect(email.text).toContain('Task: Replace toner (In progress, due October 20, 2026');
	});

	it('falls back to a plain message for system notifications', () => {
		const options = {
			...ticketNotification('unused'),
			notification: { type: 'system', event: 'system' }
		} as NotificationOptions;

		const email = notificationEmail(options, organization, 'https://keydesk.test/dashboard');

		expect(email.html).toContain('View Details');
		expect(email.text).toContain('View Details: https://keydesk.test/dashboard');
	});
});
