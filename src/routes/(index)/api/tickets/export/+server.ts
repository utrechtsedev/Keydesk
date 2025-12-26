import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import type { RequestHandler } from '@sveltejs/kit';
import { createObjectCsvStringifier } from 'csv-writer';
import { and, or, gte, lte, isNull, eq, ilike, desc, SQL } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status');
	const priority = url.searchParams.get('priority');
	const category = url.searchParams.get('category');
	const assignee = url.searchParams.get('assignee');
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const includeResolved = url.searchParams.get('includeResolved') !== 'false'; // default true

	const conditions: (SQL | undefined)[] = [];

	// Search filter
	if (search) {
		const searchPattern = `%${search}%`;
		conditions.push(
			or(
				ilike(schema.ticket.ticketNumber, searchPattern),
				ilike(schema.ticket.subject, searchPattern)
			)
		);
	}

	// Status filter
	if (status) {
		conditions.push(eq(schema.ticket.statusId, Number(status)));
	}

	// Priority filter
	if (priority) {
		conditions.push(eq(schema.ticket.priorityId, Number(priority)));
	}

	// Category filter
	if (category) {
		conditions.push(eq(schema.ticket.categoryId, Number(category)));
	}

	// Assignee filter
	if (assignee) {
		if (assignee === 'unassigned') {
			conditions.push(isNull(schema.ticket.assigneeId));
		} else {
			conditions.push(eq(schema.ticket.assigneeId, parseInt(assignee)));
		}
	}

	// Date range filter
	if (dateFrom) {
		conditions.push(gte(schema.ticket.createdAt, new Date(dateFrom)));
	}
	if (dateTo) {
		conditions.push(lte(schema.ticket.createdAt, new Date(dateTo)));
	}

	// Resolved filter
	if (!includeResolved) {
		conditions.push(isNull(schema.ticket.resolvedAt));
	}

	// Fetch tickets with relations
	const tickets = await db.query.ticket.findMany({
		where: and(...conditions),
		with: {
			requester: true,
			category: true,
			assignedUser: true,
			status: true,
			priority: true
		},
		orderBy: desc(schema.ticket.createdAt)
	});

	// CSV stringifier setup
	const csvStringifier = createObjectCsvStringifier({
		header: [
			{ id: 'ticketNumber', title: 'Ticket Number' },
			{ id: 'subject', title: 'Subject' },
			{ id: 'requester', title: 'Requester' },
			{ id: 'requesterEmail', title: 'Requester Email' },
			{ id: 'assignee', title: 'Assigned To' },
			{ id: 'status', title: 'Status' },
			{ id: 'priority', title: 'Priority' },
			{ id: 'category', title: 'Category' },
			{ id: 'channel', title: 'Channel' },
			{ id: 'lastRequesterResponseAt', title: 'Last Requester Response' },
			{ id: 'lastUserResponseAt', title: 'Last User Response' },
			{ id: 'firstResponseAt', title: 'First Response' },
			{ id: 'firstResponseTime', title: 'First Response Time (minutes)' },
			{ id: 'resolutionTime', title: 'Resolution Time (minutes)' },
			{ id: 'resolvedAt', title: 'Resolved At' },
			{ id: 'createdAt', title: 'Created At' },
			{ id: 'updatedAt', title: 'Updated At' }
		]
	});

	// Map tickets to CSV records
	const records = tickets.map((ticket) => {
		const firstResponseTime =
			ticket.firstResponseAt && ticket.createdAt
				? Math.round((ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / 60000)
				: null;

		const resolutionTime =
			ticket.resolvedAt && ticket.createdAt
				? Math.round((ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000)
				: null;

		return {
			ticketNumber: ticket.ticketNumber,
			subject: ticket.subject,
			requester: ticket.requester?.name || 'N/A',
			requesterEmail: ticket.requester?.email || 'N/A',
			category: ticket.category?.name || 'N/A',
			assignee: ticket.assignedUser?.name || 'Unassigned',
			status: ticket.status?.name || 'N/A',
			priority: ticket.priority?.name || 'N/A',
			channel: ticket.channel,
			lastRequesterResponseAt: ticket.lastRequesterResponseAt?.toISOString() || '',
			lastUserResponseAt: ticket.lastUserResponseAt?.toISOString() || '',
			firstResponseAt: ticket.firstResponseAt?.toISOString() || '',
			firstResponseTime: firstResponseTime || '',
			resolutionTime: resolutionTime || '',
			resolvedAt: ticket.resolvedAt?.toISOString() || '',
			createdAt: ticket.createdAt.toISOString(),
			updatedAt: ticket.updatedAt.toISOString()
		};
	});

	// Generate CSV
	const csvHeader = csvStringifier.getHeaderString();
	const csvBody = csvStringifier.stringifyRecords(records);
	const csv = csvHeader + csvBody;

	// Generate filename
	let filename = 'tickets-export';
	if (search) filename += `-search-${search.substring(0, 20)}`;
	if (status) filename += `-status-${status}`;
	filename += `-${Date.now()}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
