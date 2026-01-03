import type {
	Category,
	Priority,
	Requester,
	Status,
	Tag,
	Task,
	Ticket,
	TicketAttachment,
	TicketMessage,
	User
} from './core';

export type TicketDetail = {
	priorities: Priority[];
	users: User[];
	statuses: Status[];
	categories: Category[];
	ticket: Ticket & {
		tags: Tag[];
		messages: TicketMessageDetail[];
		attachments: TicketAttachment[];
		requester: Requester;
		tasks: Task[];
	};
	parentTasks: Task[];
};

export type TicketMessageDetail = TicketMessage & {
	messageUser: User | null;
	messageRequester: Requester | null;
	messageAttachments: TicketAttachment[];
};
