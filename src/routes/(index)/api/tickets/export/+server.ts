import { Ticket, Requester, Category, User, Status, Priority } from "$lib/server/db/models";
import type { RequestHandler } from "@sveltejs/kit";
import { createObjectCsvStringifier } from 'csv-writer';
import { Op } from 'sequelize';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const category = url.searchParams.get('category');
    const assignee = url.searchParams.get('assignee');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const includeResolved = url.searchParams.get('includeResolved') !== 'false'; // default true

    const where: any = {};

    if (search) {
      where[Op.or] = [
        { ticketNumber: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) where.statusId = status;
    if (priority) where.priorityId = priority;
    if (category) where.categoryId = category;
    if (assignee) {
      where.assignedUserId = assignee === 'unassigned' ? null : assignee;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    if (!includeResolved) {
      where.resolvedAt = null;
    }

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: Requester, as: 'requester', required: false },
        { model: Category, as: 'category', required: false },
        { model: User, as: 'assignedUser', required: false },
        { model: Status, as: 'status', required: false },
        { model: Priority, as: 'priority', required: false }
      ],
      order: [['createdAt', 'DESC']]
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
        { id: 'updatedAt', title: 'Updated At' },
      ]
    });

    const records = tickets.map(ticket => {
      const firstResponseTime = ticket.firstResponseAt && ticket.createdAt
        ? Math.round((ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / 60000)
        : null;

      const resolutionTime = ticket.resolvedAt && ticket.createdAt
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

    const csvHeader = csvStringifier.getHeaderString();
    const csvBody = csvStringifier.stringifyRecords(records);
    const csv = csvHeader + csvBody;

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
  } catch (err) {
    console.error('Error exporting tickets:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
