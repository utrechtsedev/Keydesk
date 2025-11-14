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
  UserNotification
};
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

export { models };
// Export individual models as well for convenience
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
};
