import { Requester } from "./requester.model.js";
import { Category } from "./category.model.js";
import { Image } from "./image.model.js";
import { Priority } from "./priority.model.js";
import { Status } from "./status.model.js";
import { User } from "./user.model.js";
import { Account } from "./account.model.js";
import { Config } from "./config.model.js";
import { Ticket } from "./ticket.model.js";
import { TicketMessage } from "./ticket-message.model.js";
import { TicketAttachment } from "./ticket-attachment.model.js";
import { Tag } from "./tag.model.js";
import { Session } from "./session.model.js"
import { Verification } from "./verification.model.js"
import { Notification } from "./notification.model.js";
import { UserNotification } from "./user-notification.model.js";
import { Task } from './task.model.js'

// ============================================================================
// MODEL ASSOCIATIONS
// ============================================================================

// User <-> Tickets (one-to-many)
User.hasMany(Ticket, {
  foreignKey: 'assignedUserId',
  as: 'assignedTickets'
});
Ticket.belongsTo(User, {
  foreignKey: 'assignedUserId',
  as: 'assignedUser'
});

// Requester <-> Tickets (one-to-many)
Requester.hasMany(Ticket, {
  foreignKey: 'requesterId',
  as: 'requestedTickets'
});
Ticket.belongsTo(Requester, {
  foreignKey: 'requesterId',
  as: 'requester'
});

// Status <-> Tickets (one-to-many)
Status.hasMany(Ticket, {
  foreignKey: 'statusId',
  as: 'statusTickets'
});
Ticket.belongsTo(Status, {
  foreignKey: 'statusId',
  as: 'status'
});

// Priority <-> Tickets (one-to-many)
Priority.hasMany(Ticket, {
  foreignKey: 'priorityId',
  as: 'priorityTickets'
});
Ticket.belongsTo(Priority, {
  foreignKey: 'priorityId',
  as: 'priority'
});

// Category <-> Tickets (one-to-many)
Category.hasMany(Ticket, {
  foreignKey: 'categoryId',
  as: 'categoryTickets'
});
Ticket.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

// Ticket <-> TicketMessages (one-to-many)
Ticket.hasMany(TicketMessage, {
  foreignKey: 'ticketId',
  as: 'messages'
});
TicketMessage.belongsTo(Ticket, {
  foreignKey: 'ticketId',
  as: 'ticket'
});

// Ticket <-> TicketAttachments (one-to-many)
Ticket.hasMany(TicketAttachment, {
  foreignKey: 'ticketId',
  as: 'ticketAttachments'
});
TicketAttachment.belongsTo(Ticket, {
  foreignKey: 'ticketId',
  as: 'attachmentTicket'
});

// TicketMessage <-> TicketAttachments (one-to-many)
TicketMessage.hasMany(TicketAttachment, {
  foreignKey: 'messageId',
  as: 'messageAttachments'
});
TicketAttachment.belongsTo(TicketMessage, {
  foreignKey: 'messageId',
  as: 'message'
});

// TicketMessage <-> User OR Requester (one-to-one)
User.hasMany(TicketMessage, {
  foreignKey: 'userId',
  as: 'userMessages'
});
Requester.hasMany(TicketMessage, {
  foreignKey: 'requesterId',
  as: 'requesterMessages'
});
TicketMessage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'messageUser'
});
TicketMessage.belongsTo(Requester, {
  foreignKey: 'requesterId',
  as: 'messageRequester'
});

// Ticket <-> Tags (many-to-many)
Ticket.belongsToMany(Tag, {
  through: 'ticketTag',
  foreignKey: 'ticketId',
  otherKey: 'tagId',
  as: 'tags'
});
Tag.belongsToMany(Ticket, {
  through: 'ticketTag',
  foreignKey: 'tagId',
  otherKey: 'ticketId',
  as: 'taggedTickets'
});

// User <-> Sessions (one-to-many)
User.hasMany(Session, {
  foreignKey: 'userId',
  as: 'sessions',
  onDelete: 'CASCADE'
});

Session.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});
// ============================================================================
// EXPORTS
// ============================================================================

//
// Notification <-> User (creator) (many-to-one)
User.hasMany(Notification, {
  foreignKey: 'createdById',
  as: 'createdNotifications'
});
Notification.belongsTo(User, {
  foreignKey: 'createdById',
  as: 'creator'
});

// Notification <-> UserNotification (one-to-many)
Notification.hasMany(UserNotification, {
  foreignKey: 'notificationId',
  as: 'userNotifications'
});
UserNotification.belongsTo(Notification, {
  foreignKey: 'notificationId',
  as: 'notification'
});

// User <-> UserNotification (one-to-many)
User.hasMany(UserNotification, {
  foreignKey: 'userId',
  as: 'notifications'
});
UserNotification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Notification <-> Ticket (for ticket-related notifications)
Ticket.hasMany(Notification, {
  foreignKey: 'relatedEntityId',
  constraints: false,
  scope: {
    relatedEntityType: 'ticket'
  },
  as: 'ticketNotifications'
});
Notification.belongsTo(Ticket, {
  foreignKey: 'relatedEntityId',
  constraints: false,
  as: 'relatedTicket'
});

// Task <-> Ticket (many-to-one, optional)
Ticket.hasMany(Task, {
  foreignKey: 'ticketId',
  as: 'tasks'
});
Task.belongsTo(Ticket, {
  foreignKey: 'ticketId',
  as: 'ticket'
});

// Task <-> Task (self-referencing for parent/child)
Task.hasMany(Task, {
  foreignKey: 'parentTaskId',
  as: 'subtasks'
});
Task.belongsTo(Task, {
  foreignKey: 'parentTaskId',
  as: 'parentTask'
});

// Task <-> User (many-to-many for assignees)
Task.belongsToMany(User, {
  through: 'taskAssignee',
  foreignKey: 'taskId',
  otherKey: 'userId',
  as: 'assignees'
});
User.belongsToMany(Task, {
  through: 'taskAssignee',
  foreignKey: 'userId',
  otherKey: 'taskId',
  as: 'assignedTasks'
});

// Task <-> User (creator)
User.hasMany(Task, {
  foreignKey: 'createdById',
  as: 'createdTasks'
});
Task.belongsTo(User, {
  foreignKey: 'createdById',
  as: 'creator'
});

// Task <-> Status
Status.hasMany(Task, {
  foreignKey: 'statusId',
  as: 'statusTasks'
});
Task.belongsTo(Status, {
  foreignKey: 'statusId',
  as: 'status'
});

// Task <-> Priority
Priority.hasMany(Task, {
  foreignKey: 'priorityId',
  as: 'priorityTasks'
});
Task.belongsTo(Priority, {
  foreignKey: 'priorityId',
  as: 'priority'
});

// Task <-> Tags (many-to-many, reusing your Tag model)
Task.belongsToMany(Tag, {
  through: 'taskTag',
  foreignKey: 'taskId',
  otherKey: 'tagId',
  as: 'tags'
});
Tag.belongsToMany(Task, {
  through: 'taskTag',
  foreignKey: 'tagId',
  otherKey: 'taskId',
  as: 'taggedTasks'
});

const models = {
  Requester,
  Config,
  Image,
  User,
  Account,
  Ticket,
  Status,
  Priority,
  Category,
  TicketMessage,
  TicketAttachment,
  Tag,
  Session,
  Verification,
  Notification,
  UserNotification,
  Task
};

export { models };

export {
  Requester,
  Config,
  Image,
  User,
  Account,
  Ticket,
  Status,
  Priority,
  Category,
  TicketMessage,
  TicketAttachment,
  Tag,
  Session,
  Verification,
  Notification,
  UserNotification,
  Task,
};
