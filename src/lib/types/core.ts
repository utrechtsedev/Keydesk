// ============================================================================
// RE-EXPORT BASE TYPES FROM DRIZZLE
// ============================================================================
export type {
	NewUser,
	NewRequester,
	NewCategory,
	NewStatus,
	NewPriority,
	NewTag,
	NewTicket,
	NewTicketMessage,
	NewTicketAttachment,
	NewTask,
	NewNotification,
	NewUserNotification,
	NewSession
} from '$lib/server/db/schema';

// ============================================================================
// EXTENDED TYPES (with relations for frontend)
// ============================================================================
import type {
	User as BaseUser,
	Requester as BaseRequester,
	Category as BaseCategory,
	Status as BaseStatus,
	Priority as BasePriority,
	Tag as BaseTag,
	Ticket as BaseTicket,
	TicketMessage as BaseTicketMessage,
	TicketAttachment as BaseTicketAttachment,
	Task as BaseTask,
	Notification as BaseNotification,
	UserNotification as BaseUserNotification,
	Session as BaseSession
} from '$lib/server/db/schema';

export interface User extends BaseUser {}

export interface Requester extends BaseRequester {}

export interface Category extends BaseCategory {}

export interface Status extends BaseStatus {}

export interface Priority extends BasePriority {}

export interface Tag extends BaseTag {}

export interface Ticket extends BaseTicket {
	priority: Priority;
	category: Category;
	assignee: User;
	requester?: Requester;
	status?: Status;
}

export interface TicketMessage extends BaseTicketMessage {}

export interface TicketAttachment extends BaseTicketAttachment {}

export interface Task extends BaseTask {
	assignee?: User;
	subtasks?: Task[];
	parentTask?: Task;
	ticket?: Ticket;
	creator?: User;
	status?: Status;
	priority?: Priority;
	tags?: Tag[];
}

export interface Notification extends BaseNotification {
	userNotifications?: UserNotification[];
	creator?: User;
	relatedTicket?: Ticket;
}

export interface UserNotification extends BaseUserNotification {
	notification?: Notification;
}

export interface Session extends BaseSession {}
