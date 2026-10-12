import {
	pgTable,
	text,
	timestamp,
	boolean,
	jsonb,
	index,
	serial,
	varchar,
	integer,
	pgEnum,
	primaryKey,
	customType,
	unique,
	foreignKey,
	pgPolicy,
	pgRole,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { NotificationPreferences } from '#lib/types/index.js';

// ============================================================================
// CUSTOM TYPES
// ============================================================================

// Custom bytea type for binary data
export const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
	dataType() {
		return 'bytea';
	},
	toDriver(value: unknown): Buffer {
		return value as Buffer;
	},
	fromDriver(value: unknown): Buffer {
		return value as Buffer;
	}
});

// ============================================================================
// ENUMS
// ============================================================================

export const channelEnum = pgEnum('channel', ['email', 'portal', 'user', 'dashboard']);
export const senderTypeEnum = pgEnum('sender_type', ['requester', 'user', 'system']);
export const messageChannelEnum = pgEnum('message_channel', [
	'email',
	'portal',
	'system',
	'api',
	'dashboard'
]);
export const uploadedByTypeEnum = pgEnum('uploaded_by_type', ['requester', 'user']);
export const notificationTypeEnum = pgEnum('notification_type', [
	'info',
	'success',
	'warning',
	'error',
	'ticket',
	'task',
	'system'
]);
export const notificationChannelEnum = pgEnum('notification_channel', ['dashboard', 'email']);
export const relatedEntityTypeEnum = pgEnum('related_entity_type', [
	'ticket',
	'task',
	'user',
	'system'
]);

// ============================================================================
// ORGANIZATIONS
// ============================================================================

/**
 * The role a tenant transaction switches to (see withTenant). It is not the tables' owner, so the
 * row level security policies below apply to it; migrations, better-auth and the command line
 * tools connect as the owner and are not limited by them.
 */
export const keydeskApp = pgRole('keydesk_app');

/** The organization of the current tenant transaction, or NULL outside one */
const currentOrganization = sql`current_setting('app.organization_id', true)::integer`;

export const organization = pgTable(
	'organization',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 255 }).notNull(),
		domain: varchar('domain', { length: 255 }).notNull().default(''),
		address: varchar('address', { length: 255 }).notNull().default(''),
		country: varchar('country', { length: 100 }).notNull().default(''),
		city: varchar('city', { length: 100 }).notNull().default(''),
		zipCode: varchar('zip_code', { length: 20 }).notNull().default(''),
		language: varchar('language', { length: 10 }).notNull().default('en'),
		timezone: varchar('timezone', { length: 100 }).notNull().default('Europe/Amsterdam'),
		nextTicketNumber: integer('next_ticket_number').notNull().default(1),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		pgPolicy('tenant_read', {
			for: 'select',
			to: keydeskApp,
			using: sql`${table.id} = ${currentOrganization}`
		}),
		pgPolicy('tenant_update', {
			for: 'update',
			to: keydeskApp,
			using: sql`${table.id} = ${currentOrganization}`,
			withCheck: sql`${table.id} = ${currentOrganization}`
		})
	]
);

/**
 * The organization a row belongs to. Inserts in a tenant transaction get its organization by
 * default; outside one the default is NULL, so the insert fails on NOT NULL.
 */
const organizationId = () =>
	integer('organization_id')
		.notNull()
		.default(currentOrganization)
		.references(() => organization.id, { onDelete: 'cascade' });

/** Rows of other organizations are invisible to a tenant transaction and can't be written */
const tenantIsolation = (organizationIdColumn: AnyPgColumn) =>
	pgPolicy('tenant_isolation', {
		for: 'all',
		to: keydeskApp,
		using: sql`${organizationIdColumn} = ${currentOrganization}`,
		withCheck: sql`${organizationIdColumn} = ${currentOrganization}`
	});

/**
 * A reference to another row of the same organization. Each reference also keeps its plain
 * foreign key, which carries the delete rule; this one only makes sure the referenced row
 * belongs to the same organization.
 */
const sameOrganization = (
	name: string,
	columns: [AnyPgColumn, AnyPgColumn],
	foreignColumns: [AnyPgColumn, AnyPgColumn]
) => foreignKey({ name, columns, foreignColumns });

// ============================================================================
// BETTER-AUTH TABLES
// ============================================================================

export const user = pgTable(
	'user',
	{
		id: integer('id').generatedByDefaultAsIdentity().primaryKey(),
		organizationId: organizationId(),
		name: varchar('name', { length: 255 }).notNull(),
		email: varchar('email', { length: 255 }).notNull().unique(),
		emailVerified: boolean('email_verified').default(false).notNull(),
		image: varchar('image', { length: 500 }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		role: varchar('role', { length: 50 }),
		banned: boolean('banned').default(false),
		banReason: text('ban_reason'),
		banExpires: timestamp('ban_expires'),
		notificationPreferences: jsonb('notification_preferences')
			.$type<NotificationPreferences>()
			.notNull()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('user_organization_id_id_unique').on(table.organizationId, table.id)
	]
);

export const session = pgTable(
	'session',
	{
		id: integer('id').generatedByDefaultAsIdentity().primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: varchar('token', { length: 500 }).notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: varchar('user_agent', { length: 500 }),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		impersonatedBy: varchar('impersonated_by', { length: 255 })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: integer('id').generatedByDefaultAsIdentity().primaryKey(),
		accountId: varchar('account_id', { length: 255 }).notNull(),
		providerId: varchar('provider_id', { length: 100 }).notNull(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: varchar('scope', { length: 500 }),
		password: varchar('password', { length: 255 }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: integer('id').generatedByDefaultAsIdentity().primaryKey(),
		identifier: varchar('identifier', { length: 255 }).notNull(),
		value: varchar('value', { length: 500 }).notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

/**
 * An invited user who hasn't set a password yet. The invitation email links to the token; only
 * its SHA-256 hash is stored. Setting the password deletes the row.
 */
export const invitation = pgTable(
	'invitation',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		userId: integer('user_id')
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: 'cascade' }),
		tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		sameOrganization(
			'invitation_user_same_org_fk',
			[table.organizationId, table.userId],
			[user.organizationId, user.id]
		)
	]
);

// ============================================================================
// APPLICATION TABLES
// ============================================================================

export const config = pgTable(
	'config',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		key: varchar('key', { length: 100 }).notNull(),
		value: jsonb('value').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('config_organization_id_key_unique').on(table.organizationId, table.key)
	]
);

export const image = pgTable(
	'image',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		fileName: varchar('file_name', { length: 255 }).notNull(),
		mimeType: varchar('mime_type', { length: 100 }).notNull(),
		fileData: bytea('file_data').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	// The organization's logo, one per organization
	(table) => [
		tenantIsolation(table.organizationId),
		unique('image_organization_id_unique').on(table.organizationId)
	]
);

export const requester = pgTable(
	'requester',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		name: varchar('name', { length: 100 }),
		email: varchar('email', { length: 100 }).notNull(),
		phone: varchar('phone', { length: 20 }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('requester_organization_id_id_unique').on(table.organizationId, table.id),
		unique('requester_organization_id_email_unique').on(table.organizationId, table.email)
	]
);

export const category = pgTable(
	'category',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		name: varchar('name', { length: 50 }).notNull(),
		description: text('description'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('category_organization_id_id_unique').on(table.organizationId, table.id),
		unique('category_organization_id_name_unique').on(table.organizationId, table.name)
	]
);

export const status = pgTable(
	'status',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		name: varchar('name', { length: 50 }).notNull(),
		color: varchar('color', { length: 7 }).notNull(),
		isResolved: boolean('is_resolved').default(false),
		isDefault: boolean('is_default').default(false),
		isClosed: boolean('is_closed').default(false),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('status_organization_id_id_unique').on(table.organizationId, table.id),
		unique('status_organization_id_name_unique').on(table.organizationId, table.name)
	]
);

export const priority = pgTable(
	'priority',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		name: varchar('name', { length: 50 }).notNull(),
		color: varchar('color', { length: 7 }).notNull(),
		isDefault: boolean('is_default').default(false),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('priority_organization_id_id_unique').on(table.organizationId, table.id),
		unique('priority_organization_id_name_unique').on(table.organizationId, table.name)
	]
);

export const tag = pgTable(
	'tag',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		name: varchar('name', { length: 100 }).notNull(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('tag_organization_id_id_unique').on(table.organizationId, table.id),
		unique('tag_organization_id_name_unique').on(table.organizationId, table.name)
	]
);

export const ticket = pgTable(
	'ticket',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		// Numbered per organization, from organization.next_ticket_number
		ticketNumber: integer('ticket_number').notNull(),
		requesterId: integer('requester_id')
			.notNull()
			.references(() => requester.id),
		assigneeId: integer('assigned_user_id').references(() => user.id, { onDelete: 'set null' }),
		subject: varchar('subject', { length: 500 }).notNull(),
		channel: channelEnum('channel').notNull(),
		statusId: integer('status_id')
			.notNull()
			.references(() => status.id),
		priorityId: integer('priority_id')
			.notNull()
			.references(() => priority.id),
		categoryId: integer('category_id').references(() => category.id),
		firstResponseAt: timestamp('first_response_at'),
		resolvedAt: timestamp('resolved_at'),
		closedAt: timestamp('closed_at'),
		targetDate: timestamp('target_date').notNull(),
		lastUserResponseAt: timestamp('last_user_response_at'),
		lastRequesterResponseAt: timestamp('last_requester_response_at'),
		responseCount: integer('response_count').notNull().default(1),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow(),
		deletedAt: timestamp('deleted_at')
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('ticket_organization_id_id_unique').on(table.organizationId, table.id),
		unique('ticket_organization_id_ticket_number_unique').on(
			table.organizationId,
			table.ticketNumber
		),
		sameOrganization(
			'ticket_requester_same_org_fk',
			[table.organizationId, table.requesterId],
			[requester.organizationId, requester.id]
		),
		sameOrganization(
			'ticket_assignee_same_org_fk',
			[table.organizationId, table.assigneeId],
			[user.organizationId, user.id]
		),
		sameOrganization(
			'ticket_status_same_org_fk',
			[table.organizationId, table.statusId],
			[status.organizationId, status.id]
		),
		sameOrganization(
			'ticket_priority_same_org_fk',
			[table.organizationId, table.priorityId],
			[priority.organizationId, priority.id]
		),
		sameOrganization(
			'ticket_category_same_org_fk',
			[table.organizationId, table.categoryId],
			[category.organizationId, category.id]
		)
	]
);

export const ticketMessage = pgTable(
	'ticket_message',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		ticketId: integer('ticket_id')
			.notNull()
			.references(() => ticket.id, { onDelete: 'cascade' }),
		senderType: senderTypeEnum('sender_type').notNull(),
		requesterId: integer('requester_id').references(() => requester.id),
		senderName: varchar('sender_name', { length: 100 }),
		senderEmail: varchar('sender_email', { length: 255 }),
		userId: integer('user_id').references(() => user.id, { onDelete: 'set null' }),
		message: text('message').notNull(),
		isPrivate: boolean('is_private').notNull().default(false),
		channel: messageChannelEnum('channel').notNull(),
		isFirstResponse: boolean('is_first_response').notNull().default(false),
		hasAttachments: boolean('has_attachments').notNull().default(false),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('ticket_message_organization_id_id_unique').on(table.organizationId, table.id),
		sameOrganization(
			'ticket_message_ticket_same_org_fk',
			[table.organizationId, table.ticketId],
			[ticket.organizationId, ticket.id]
		),
		sameOrganization(
			'ticket_message_requester_same_org_fk',
			[table.organizationId, table.requesterId],
			[requester.organizationId, requester.id]
		),
		sameOrganization(
			'ticket_message_user_same_org_fk',
			[table.organizationId, table.userId],
			[user.organizationId, user.id]
		)
	]
);

export const ticketAttachment = pgTable(
	'ticket_attachment',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		ticketId: integer('ticket_id')
			.notNull()
			.references(() => ticket.id, { onDelete: 'cascade' }),
		messageId: integer('message_id').references(() => ticketMessage.id, { onDelete: 'set null' }),
		fileName: varchar('file_name', { length: 255 }).notNull(),
		originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
		/** Where the file is in the attachments bucket (R2) */
		storageKey: varchar('storage_key', { length: 500 }).notNull(),
		fileSize: integer('file_size').notNull(),
		mimeType: varchar('mime_type', { length: 100 }).notNull(),
		uploadedByType: uploadedByTypeEnum('uploaded_by_type').notNull(),
		uploadedById: integer('uploaded_by_id').notNull(),
		uploadedByName: varchar('uploaded_by_name', { length: 100 }).notNull(),
		downloadCount: integer('download_count').notNull().default(0),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		sameOrganization(
			'ticket_attachment_ticket_same_org_fk',
			[table.organizationId, table.ticketId],
			[ticket.organizationId, ticket.id]
		),
		sameOrganization(
			'ticket_attachment_message_same_org_fk',
			[table.organizationId, table.messageId],
			[ticketMessage.organizationId, ticketMessage.id]
		)
	]
);

export const task = pgTable(
	'task',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		title: varchar('title', { length: 255 }).notNull(),
		description: text('description'),
		// A ticket's tasks, and a task's subtasks, are deleted along with it
		ticketId: integer('ticket_id').references(() => ticket.id, { onDelete: 'cascade' }),
		parentTaskId: integer('parent_task_id').references((): AnyPgColumn => task.id, {
			onDelete: 'cascade'
		}),
		createdById: integer('created_by_id').references(() => user.id, { onDelete: 'set null' }),
		assigneeId: integer('assignee_id').references(() => user.id, { onDelete: 'set null' }),
		statusId: integer('status_id')
			.notNull()
			.references(() => status.id),
		priorityId: integer('priority_id')
			.notNull()
			.references(() => priority.id),
		dueDate: timestamp('due_date').notNull(),
		startDate: timestamp('start_date'),
		completedAt: timestamp('completed_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow(),
		deletedAt: timestamp('deleted_at')
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('task_organization_id_id_unique').on(table.organizationId, table.id),
		sameOrganization(
			'task_ticket_same_org_fk',
			[table.organizationId, table.ticketId],
			[ticket.organizationId, ticket.id]
		),
		sameOrganization(
			'task_parent_task_same_org_fk',
			[table.organizationId, table.parentTaskId],
			[table.organizationId, table.id]
		),
		sameOrganization(
			'task_created_by_same_org_fk',
			[table.organizationId, table.createdById],
			[user.organizationId, user.id]
		),
		sameOrganization(
			'task_assignee_same_org_fk',
			[table.organizationId, table.assigneeId],
			[user.organizationId, user.id]
		),
		sameOrganization(
			'task_status_same_org_fk',
			[table.organizationId, table.statusId],
			[status.organizationId, status.id]
		),
		sameOrganization(
			'task_priority_same_org_fk',
			[table.organizationId, table.priorityId],
			[priority.organizationId, priority.id]
		)
	]
);

export const notification = pgTable(
	'notification',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		title: varchar('title', { length: 255 }).notNull(),
		message: text('message').notNull(),
		type: notificationTypeEnum('type').notNull().default('info'),
		channel: notificationChannelEnum('channel').notNull().default('dashboard'),
		relatedEntityType: relatedEntityTypeEnum('related_entity_type'),
		relatedEntityId: integer('related_entity_id'),
		actionUrl: varchar('action_url', { length: 500 }),
		createdById: integer('created_by_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('notification_organization_id_id_unique').on(table.organizationId, table.id),
		sameOrganization(
			'notification_created_by_same_org_fk',
			[table.organizationId, table.createdById],
			[user.organizationId, user.id]
		)
	]
);

export const userNotification = pgTable(
	'user_notification',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		notificationId: integer('notification_id')
			.notNull()
			.references(() => notification.id, { onDelete: 'cascade' }),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		isRead: boolean('is_read').default(false),
		readAt: timestamp('read_at'),
		sentViaEmail: boolean('sent_via_email').notNull().default(false),
		emailSentAt: timestamp('email_sent_at'),
		emailError: varchar('email_error', { length: 1000 }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		sameOrganization(
			'user_notification_notification_same_org_fk',
			[table.organizationId, table.notificationId],
			[notification.organizationId, notification.id]
		),
		sameOrganization(
			'user_notification_user_same_org_fk',
			[table.organizationId, table.userId],
			[user.organizationId, user.id]
		)
	]
);

export const email = pgTable(
	'email',
	{
		id: serial('id').primaryKey(),
		organizationId: organizationId(),
		uid: integer('uid').notNull(),
		fromAddress: varchar('from_address', { length: 255 }).notNull(),
		fromName: varchar('from_name', { length: 255 }),
		subject: varchar('subject', { length: 500 }).notNull(),
		textContent: text('text_content'),
		htmlContent: text('html_content'),
		rawSource: text('raw_source'),
		receivedAt: timestamp('received_at').notNull().defaultNow(),
		size: integer('size'),
		hasAttachments: boolean('has_attachments').default(false),
		processed: boolean('processed').default(false),
		processedAt: timestamp('processed_at'),
		processingError: text('processing_error'),
		// The archived email outlives the ticket it created, so deleting the ticket only unlinks it
		ticketId: integer('ticket_id').references(() => ticket.id, { onDelete: 'set null' }),
		requesterId: integer('requester_id').references(() => requester.id),
		ticketMessageId: integer('ticket_message_id').references(() => ticketMessage.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [
		tenantIsolation(table.organizationId),
		unique('email_organization_id_uid_unique').on(table.organizationId, table.uid),
		index('email_rate_limit_idx').on(table.fromAddress, table.createdAt.desc()),
		index('email_unprocessed_idx')
			.on(table.receivedAt.desc())
			.where(sql`${table.processed} = false`),
		sameOrganization(
			'email_ticket_same_org_fk',
			[table.organizationId, table.ticketId],
			[ticket.organizationId, ticket.id]
		),
		sameOrganization(
			'email_requester_same_org_fk',
			[table.organizationId, table.requesterId],
			[requester.organizationId, requester.id]
		),
		sameOrganization(
			'email_ticket_message_same_org_fk',
			[table.organizationId, table.ticketMessageId],
			[ticketMessage.organizationId, ticketMessage.id]
		)
	]
);
// ============================================================================
// JOIN TABLES (Many-to-Many)
// ============================================================================

export const ticketTag = pgTable(
	'ticket_tag',
	{
		organizationId: organizationId(),
		ticketId: integer('ticket_id')
			.notNull()
			.references(() => ticket.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.ticketId, table.tagId] }),
		tenantIsolation(table.organizationId),
		sameOrganization(
			'ticket_tag_ticket_same_org_fk',
			[table.organizationId, table.ticketId],
			[ticket.organizationId, ticket.id]
		),
		sameOrganization(
			'ticket_tag_tag_same_org_fk',
			[table.organizationId, table.tagId],
			[tag.organizationId, tag.id]
		)
	]
);

export const taskTag = pgTable(
	'task_tag',
	{
		organizationId: organizationId(),
		taskId: integer('task_id')
			.notNull()
			.references(() => task.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.taskId, table.tagId] }),
		tenantIsolation(table.organizationId),
		sameOrganization(
			'task_tag_task_same_org_fk',
			[table.organizationId, table.taskId],
			[task.organizationId, task.id]
		),
		sameOrganization(
			'task_tag_tag_same_org_fk',
			[table.organizationId, table.tagId],
			[tag.organizationId, tag.id]
		)
	]
);
