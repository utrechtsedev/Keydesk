import type { Task, Ticket, User } from '$lib/types';
import { formatDate } from '$lib/utils/date';

// notification-rules.ts
type TicketChangeRule = {
	title: string;
	message: string;
	event: 'assigned' | 'updated' | 'resolved' | 'closed';
	isClosing?: boolean | null;
};

type ChangeRules = {
	added?: (oldTicket: Ticket, newTicket: Ticket, user: User) => TicketChangeRule;
	removed?: (oldTicket: Ticket, newTicket: Ticket, user: User) => TicketChangeRule;
	changed?: (oldTicket: Ticket, newTicket: Ticket, user: User) => TicketChangeRule;
};

export const TICKET_CHANGE_RULES: Record<string, ChangeRules> = {
	assigneeId: {
		added: (oldTicket, newTicket, user) => ({
			title: 'Ticket assigned to you',
			message: `Ticket assigned by ${user.name}: ${newTicket.subject}`,
			event: 'assigned'
		}),
		removed: (oldTicket, newTicket, user) => ({
			title: 'Unassigned from ticket',
			message: `Ticket unassigned by ${user.name}: ${newTicket.subject}`,
			event: 'updated'
		}),
		changed: (oldTicket, newTicket, user) => ({
			title: 'Ticket reassigned',
			message: `Ticket reassigned by ${user.name}: ${newTicket.subject}`,
			event: 'assigned'
		})
	},
	requesterId: {
		changed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Requester changed from "${oldTicket.requester?.name} to ${newTicket.requester?.name} by ${user.name}`,
			event: 'updated'
		})
	},
	subject: {
		changed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Subject changed from "${oldTicket.subject}" to "${newTicket.subject}" by ${user.name}`,
			event: 'updated'
		})
	},
	statusId: {
		changed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Status changed from ${oldTicket.status?.name} to ${newTicket.status?.name} by ${user.name}`,
			event: 'updated',
			isClosing: !oldTicket.status?.isClosed && newTicket.status?.isClosed
		})
	},

	priorityId: {
		changed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Priority changed from ${oldTicket.priority.name} to ${newTicket.priority.name} by ${user.name}`,
			event: 'updated'
		})
	},
	categoryId: {
		added: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Category ${newTicket.category.name} added by ${user.name}`,
			event: 'updated'
		}),

		changed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Categpry changed from ${oldTicket.category.name} to ${newTicket.category.name} by ${user.name}`,
			event: 'updated'
		}),

		removed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Category ${oldTicket.priority.name} removed by ${user.name}`,
			event: 'updated'
		})
	},

	targetDate: {
		added: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Due date set to ${formatDate(newTicket.targetDate)} by ${user.name}`,
			event: 'updated'
		}),
		changed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Due date changed from ${formatDate(oldTicket.targetDate)} to ${formatDate(newTicket.targetDate)} by ${user.name}`,
			event: 'updated'
		}),
		removed: (oldTicket, newTicket, user) => ({
			title: 'Ticket updated',
			message: `Due date removed by ${user.name}`,
			event: 'updated'
		})
	},
	resolvedAt: {
		added: (oldTicket, newTicket, user) => ({
			title: 'Ticket resolved',
			message: `Ticket resolved by ${user.name}: ${newTicket.subject}`,
			event: 'resolved'
		}),
		removed: (oldTicket, newTicket, user) => ({
			title: 'Ticket reopened',
			message: `Ticket reopened by ${user.name}: ${newTicket.subject}`,
			event: 'updated'
		})
	},
	closedAt: {
		added: (oldTicket, newTicket, user) => ({
			title: 'Ticket closed',
			message: `Ticket closed by ${user.name}: ${newTicket.subject}`,
			event: 'closed'
		}),
		removed: (oldTicket, newTicket, user) => ({
			title: 'Ticket reopened',
			message: `Ticket reopened by ${user.name}: ${newTicket.subject}`,
			event: 'updated'
		})
	}
};

type TaskChangeRule = {
	title: string;
	message: string;
	event: 'created' | 'assigned' | 'updated' | 'resolved' | 'closed';
};

type TaskChangeRules = {
	added?: (oldTask: Task, newTask: Task, user: User) => TaskChangeRule;
	removed?: (oldTask: Task, newTask: Task, user: User) => TaskChangeRule;
	changed?: (oldTask: Task, newTask: Task, user: User) => TaskChangeRule;
};

export const TASK_CHANGE_RULES: Record<string, TaskChangeRules> = {
	assigneeId: {
		added: (oldTask, newTask, user) => ({
			title: 'Task assigned to you',
			message: `Task assigned by ${user.name}: ${newTask.title}`,
			event: 'assigned'
		}),
		removed: (oldTask, newTask, user) => ({
			title: 'Unassigned from task',
			message: `Task unassigned by ${user.name}: ${newTask.title}`,
			event: 'updated'
		}),
		changed: (oldTask, newTask, user) => ({
			title: 'Task reassigned',
			message: `Task reassigned by ${user.name}: ${newTask.title}`,
			event: 'assigned'
		})
	},
	title: {
		changed: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Title changed from "${oldTask.title}" to "${newTask.title}" by ${user.name}`,
			event: 'updated'
		})
	},
	statusId: {
		changed: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Status changed from ${oldTask.status?.name} to ${newTask.status?.name} by ${user.name}`,
			event: 'updated'
		})
	},
	priorityId: {
		changed: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Priority changed from ${oldTask.priority!.name} to ${newTask.priority!.name} by ${user.name}`,
			event: 'updated'
		})
	},
	dueDate: {
		added: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Due date set to ${formatDate(newTask.dueDate)} by ${user.name}`,
			event: 'updated'
		}),
		changed: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Due date changed from ${formatDate(oldTask.dueDate)} to ${formatDate(newTask.dueDate)} by ${user.name}`,
			event: 'updated'
		}),
		removed: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Due date removed by ${user.name}`,
			event: 'updated'
		})
	},
	startDate: {
		added: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Start date set to ${formatDate(newTask.startDate!)} by ${user.name}`,
			event: 'updated'
		}),
		changed: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Start date changed from ${formatDate(oldTask.startDate!)} to ${formatDate(newTask.startDate!)} by ${user.name}`,
			event: 'updated'
		}),
		removed: (oldTask, newTask, user) => ({
			title: 'Task updated',
			message: `Start date removed by ${user.name}`,
			event: 'updated'
		})
	},
	completedAt: {
		added: (oldTask, newTask, user) => ({
			title: 'Task completed',
			message: `Task completed by ${user.name}: ${newTask.title}`,
			event: 'resolved' // Changed from 'completed' to 'resolved'
		}),
		removed: (oldTask, newTask, user) => ({
			title: 'Task reopened',
			message: `Task reopened by ${user.name}: ${newTask.title}`,
			event: 'updated'
		})
	}
};
