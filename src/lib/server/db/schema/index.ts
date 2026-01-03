export * from './tables';
export * from './validation';
export * from './relations';
import {
	user,
	account,
	session,
	verification,
	requester,
	category,
	status,
	priority,
	tag,
	ticket,
	ticketMessage,
	ticketAttachment,
	task,
	notification,
	userNotification,
	config,
	image,
	email
} from './tables';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Better-Auth types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

// Application types
export type Requester = typeof requester.$inferSelect;
export type NewRequester = typeof requester.$inferInsert;

export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;

export type Status = typeof status.$inferSelect;
export type NewStatus = typeof status.$inferInsert;

export type Priority = typeof priority.$inferSelect;
export type NewPriority = typeof priority.$inferInsert;

export type Tag = typeof tag.$inferSelect;
export type NewTag = typeof tag.$inferInsert;

export type Ticket = typeof ticket.$inferSelect;
export type NewTicket = typeof ticket.$inferInsert;

export type TicketMessage = typeof ticketMessage.$inferSelect;
export type NewTicketMessage = typeof ticketMessage.$inferInsert;

export type TicketAttachment = typeof ticketAttachment.$inferSelect;
export type NewTicketAttachment = typeof ticketAttachment.$inferInsert;

export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;

export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;

export type UserNotification = typeof userNotification.$inferSelect;
export type NewUserNotification = typeof userNotification.$inferInsert;

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;

export type Image = typeof image.$inferSelect;
export type NewImage = typeof image.$inferInsert;

export type Email = typeof email.$inferSelect;
export type NewEmail = typeof email.$inferInsert;
