import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { stringify } from 'csv-stringify/sync';
import { and, gte, lte, isNull, eq, desc, SQL } from 'drizzle-orm';
import { ticketSearchCondition } from '#lib/server/services/ticket.service.js';
import { requireAuth } from '#lib/server/auth.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { db } = requireAuth(locals);
	const params = schema.ticketExportQuerySchema.parse(schema.parseSearchParams(url.searchParams));

	const conditions: (SQL | undefined)[] = [];

	if (params.search) {
		conditions.push(ticketSearchCondition(params.search));
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

	const columns = [
		{ key: 'ticketNumber', header: 'Ticket Number' },
		{ key: 'subject', header: 'Subject' },
		{ key: 'requester', header: 'Requester' },
		{ key: 'requesterEmail', header: 'Requester Email' },
		{ key: 'assignee', header: 'Assigned To' },
		{ key: 'status', header: 'Status' },
		{ key: 'priority', header: 'Priority' },
		{ key: 'category', header: 'Category' },
		{ key: 'channel', header: 'Channel' },
		{ key: 'lastRequesterResponseAt', header: 'Last Requester Response' },
		{ key: 'lastUserResponseAt', header: 'Last User Response' },
		{ key: 'firstResponseAt', header: 'First Response' },
		{ key: 'firstResponseTime', header: 'First Response Time (minutes)' },
		{ key: 'resolutionTime', header: 'Resolution Time (minutes)' },
		{ key: 'resolvedAt', header: 'Resolved At' },
		{ key: 'createdAt', header: 'Created At' },
		{ key: 'updatedAt', header: 'Updated At' }
	];

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

	const csv = stringify(records, { header: true, columns });

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
