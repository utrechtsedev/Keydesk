import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import type { RequestHandler } from '@sveltejs/kit';
import { createObjectCsvStringifier } from 'csv-writer';
import { and, or, gte, lte, isNull, eq, ilike, desc, SQL } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const params = schema.ticketExportQuerySchema.parse(schema.parseSearchParams(url.searchParams));

	const conditions: (SQL | undefined)[] = [];

	if (params.search) {
		const searchPattern = `%${params.search}%`;
		conditions.push(
			or(
				ilike(schema.ticket.ticketNumber, searchPattern),
				ilike(schema.ticket.subject, searchPattern)
			)
		);
	}

	if (params.status) {
		conditions.push(eq(schema.ticket.statusId, params.status));
	}

	if (params.priority) {
		conditions.push(eq(schema.ticket.priorityId, params.priority));
	}

	if (params.category) {
		conditions.push(eq(schema.ticket.categoryId, params.category));
	}

	if (params.assignee) {
		if (params.assignee === 'unassigned') {
			conditions.push(isNull(schema.ticket.assigneeId));
		} else {
			conditions.push(eq(schema.ticket.assigneeId, params.assignee));
		}
	}

	if (params.dateFrom) {
		conditions.push(gte(schema.ticket.createdAt, params.dateFrom));
	}
	if (params.dateTo) {
		conditions.push(lte(schema.ticket.createdAt, params.dateTo));
	}

	if (!params.includeResolved) {
		conditions.push(isNull(schema.ticket.resolvedAt));
	}

	const tickets = await db.query.ticket.findMany({
		where: and(...conditions),
		with: {
			requester: true,
			category: true,
			assignee: true,
			status: true,
			priority: true
		},
		orderBy: desc(schema.ticket.createdAt)
	});

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
			assignee: ticket.assignee?.name || 'Unassigned',
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

	const csvHeader = csvStringifier.getHeaderString();
	const csvBody = csvStringifier.stringifyRecords(records);
	const csv = csvHeader + csvBody;

	let filename = 'tickets-export';
	if (params.search) filename += `-search-${params.search.substring(0, 20)}`;
	if (params.status) filename += `-status-${params.status}`;
	filename += `-${Date.now()}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
