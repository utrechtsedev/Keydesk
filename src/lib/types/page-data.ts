import type { TicketList } from './ticket-list';
import type {
	Category,
	Priority,
	Session,
	Status,
	Tag,
	Task,
	User,
	UserNotification
} from './core';
import type { Organization } from './configuration';

export interface PageData {
	user: User;
	session: Session;
	notifications: UserNotification[];
	organization: Organization;
}

export interface TicketPageData extends PageData {
	tickets: TicketList[];
	pageCount: number;
	totalCount: number;
	users: User[];
	categories: Category[];
	statuses: Status[];
	priorities: Priority[];
	tags: Tag[];
}

export interface TaskPageData extends PageData {
	tasks: Task[];
	task?: Task;
	finishedTasks: Task[];
	users: User[];
	statuses: Status[];
	priorities: Priority[];
	tags: Tag[];
}
