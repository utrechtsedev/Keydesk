import type { Category, Priority, Requester, Status, Ticket, User } from './core';

export type TicketList = Ticket & {
	requester: Requester;
	category: Category;
	assignee: User;
	status: Status;
	priority: Priority;
};
