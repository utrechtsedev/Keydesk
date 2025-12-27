import { relations } from 'drizzle-orm';
import {
	user,
	session,
	account,
	requester,
	category,
	status,
	priority,
	ticket,
	ticketMessage,
	ticketAttachment,
	tag,
	ticketTag,
	task,
	taskTag,
	notification,
	userNotification
} from './tables';

// ============================================================================
// RELATIONS
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	// Added missing relations:
	assignedTickets: many(ticket, { relationName: 'assigned_user' }),
	ticketMessages: many(ticketMessage, { relationName: 'message_user' }),
	assignedTasks: many(task, { relationName: 'task_assignee' }),
	createdTasks: many(task, { relationName: 'task_creator' }),
	createdNotifications: many(notification, { relationName: 'notification_creator' }),
	userNotifications: many(userNotification)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

export const requesterRelations = relations(requester, ({ many }) => ({
	requestedTickets: many(ticket),
	requesterMessages: many(ticketMessage, { relationName: 'message_requester' })
}));

export const categoryRelations = relations(category, ({ many }) => ({
	categoryTickets: many(ticket)
}));

export const statusRelations = relations(status, ({ many }) => ({
	statusTickets: many(ticket),
	statusTasks: many(task)
}));

export const priorityRelations = relations(priority, ({ many }) => ({
	priorityTickets: many(ticket),
	priorityTasks: many(task)
}));

export const ticketRelations = relations(ticket, ({ one, many }) => ({
	requester: one(requester, {
		fields: [ticket.requesterId],
		references: [requester.id]
	}),
	assignee: one(user, {
		fields: [ticket.assigneeId],
		references: [user.id],
		relationName: 'assigned_user'
	}),
	status: one(status, {
		fields: [ticket.statusId],
		references: [status.id]
	}),
	priority: one(priority, {
		fields: [ticket.priorityId],
		references: [priority.id]
	}),
	category: one(category, {
		fields: [ticket.categoryId],
		references: [category.id]
	}),
	messages: many(ticketMessage),
	ticketAttachments: many(ticketAttachment),
	tasks: many(task),
	ticketNotifications: many(notification),
	ticketTags: many(ticketTag)
}));

export const ticketMessageRelations = relations(ticketMessage, ({ one, many }) => ({
	ticket: one(ticket, {
		fields: [ticketMessage.ticketId],
		references: [ticket.id]
	}),
	messageUser: one(user, {
		fields: [ticketMessage.userId],
		references: [user.id],
		relationName: 'message_user'
	}),
	messageRequester: one(requester, {
		fields: [ticketMessage.requesterId],
		references: [requester.id],
		relationName: 'message_requester'
	}),
	messageAttachments: many(ticketAttachment)
}));

export const ticketAttachmentRelations = relations(ticketAttachment, ({ one }) => ({
	attachmentTicket: one(ticket, {
		fields: [ticketAttachment.ticketId],
		references: [ticket.id]
	}),
	message: one(ticketMessage, {
		fields: [ticketAttachment.messageId],
		references: [ticketMessage.id]
	})
}));

export const tagRelations = relations(tag, ({ many }) => ({
	ticketTags: many(ticketTag),
	taskTags: many(taskTag)
}));

export const ticketTagRelations = relations(ticketTag, ({ one }) => ({
	ticket: one(ticket, {
		fields: [ticketTag.ticketId],
		references: [ticket.id]
	}),
	tag: one(tag, {
		fields: [ticketTag.tagId],
		references: [tag.id]
	})
}));

export const taskRelations = relations(task, ({ one, many }) => ({
	ticket: one(ticket, {
		fields: [task.ticketId],
		references: [ticket.id]
	}),
	parentTask: one(task, {
		fields: [task.parentTaskId],
		references: [task.id],
		relationName: 'task_parent'
	}),
	subtasks: many(task, { relationName: 'task_parent' }),
	assignee: one(user, {
		fields: [task.assigneeId],
		references: [user.id],
		relationName: 'task_assignee'
	}),
	creator: one(user, {
		fields: [task.createdById],
		references: [user.id],
		relationName: 'task_creator'
	}),
	status: one(status, {
		fields: [task.statusId],
		references: [status.id]
	}),
	priority: one(priority, {
		fields: [task.priorityId],
		references: [priority.id]
	}),
	taskTags: many(taskTag)
}));

export const taskTagRelations = relations(taskTag, ({ one }) => ({
	task: one(task, {
		fields: [taskTag.taskId],
		references: [task.id]
	}),
	tag: one(tag, {
		fields: [taskTag.tagId],
		references: [tag.id]
	})
}));

export const notificationRelations = relations(notification, ({ one, many }) => ({
	creator: one(user, {
		fields: [notification.createdById],
		references: [user.id],
		relationName: 'notification_creator'
	}),
	relatedTicket: one(ticket, {
		fields: [notification.relatedEntityId],
		references: [ticket.id]
	}),
	userNotifications: many(userNotification)
}));

export const userNotificationRelations = relations(userNotification, ({ one }) => ({
	notification: one(notification, {
		fields: [userNotification.notificationId],
		references: [notification.id]
	}),
	user: one(user, {
		fields: [userNotification.userId],
		references: [user.id]
	})
}));
