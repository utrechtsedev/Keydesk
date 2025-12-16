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
} from "drizzle-orm/pg-core";

// ============================================================================
// CUSTOM TYPES
// ============================================================================

// Custom bytea type for binary data
export const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
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

export const channelEnum = pgEnum("channel", ["email", "portal", "user", "dashboard"]);
export const senderTypeEnum = pgEnum("sender_type", ["requester", "user", "system"]);
export const messageChannelEnum = pgEnum("message_channel", ["email", "portal", "system", "api", "dashboard"]);
export const uploadedByTypeEnum = pgEnum("uploaded_by_type", ["requester", "user"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "success", "warning", "error", "ticket", "task", "system"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["dashboard", "email"]);
export const relatedEntityTypeEnum = pgEnum("related_entity_type", ["ticket", "task", "user", "system"]);

// ============================================================================
// BETTER-AUTH TABLES
// ============================================================================

export const user = pgTable("user", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  notificationPreferences: jsonb("notification_preferences").notNull(),
});

export const session = pgTable(
  "session",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================================================
// APPLICATION TABLES
// ============================================================================

export const config = pgTable("config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const image = pgTable("image", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileData: bytea("file_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const requester = pgTable("requester", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const category = pgTable("category", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  prefix: varchar("prefix", { length: 5 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const status = pgTable("status", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  isResolved: boolean("is_resolved").notNull(),
  isDefault: boolean("is_default").notNull(),
  isClosed: boolean("is_closed").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const priority = pgTable("priority", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  isDefault: boolean("is_default").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const tag = pgTable("tag", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticket = pgTable("ticket", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 10 }).notNull(),
  requesterId: integer("requester_id").notNull().references(() => requester.id),
  assignedUserId: integer("assigned_user_id").references(() => user.id),
  subject: text("subject").notNull(),
  channel: channelEnum("channel").notNull(),
  statusId: integer("status_id").notNull().references(() => status.id),
  priorityId: integer("priority_id").notNull().references(() => priority.id),
  categoryId: integer("category_id").notNull().references(() => category.id),
  firstResponseAt: timestamp("first_response_at"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  targetDate: timestamp("target_date").notNull(),
  lastUserResponseAt: timestamp("last_user_response_at"),
  lastRequesterResponseAt: timestamp("last_requester_response_at"),
  responseCount: integer("response_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const ticketMessage = pgTable("ticket_message", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticket.id, { onDelete: "cascade" }),
  senderType: senderTypeEnum("sender_type").notNull(),
  requesterId: integer("requester_id").references(() => requester.id),
  senderName: varchar("sender_name", { length: 100 }),
  senderEmail: varchar("sender_email", { length: 255 }),
  userId: integer("user_id").references(() => user.id),
  message: text("message").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  channel: messageChannelEnum("channel").notNull(),
  isFirstResponse: boolean("is_first_response").notNull().default(false),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const ticketAttachment = pgTable("ticket_attachment", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticket.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => ticketMessage.id, { onDelete: "set null" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  uploadedByType: uploadedByTypeEnum("uploaded_by_type").notNull(),
  uploadedById: integer("uploaded_by_id").notNull(),
  uploadedByName: varchar("uploaded_by_name", { length: 100 }).notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const task = pgTable("task", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  ticketId: integer("ticket_id").references(() => ticket.id),
  parentTaskId: integer("parent_task_id").references((): any => task.id),
  createdById: integer("created_by_id").notNull().references(() => user.id),
  assigneeId: integer("assignee_id").notNull().references(() => user.id),
  statusId: integer("status_id").notNull().references(() => status.id),
  priorityId: integer("priority_id").notNull().references(() => priority.id),
  dueDate: timestamp("due_date").notNull(),
  startDate: timestamp("start_date"),
  completedAt: timestamp("completed_at"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const notification = pgTable("notification", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull().default("info"),
  channel: notificationChannelEnum("channel").notNull().default("dashboard"),
  relatedEntityType: relatedEntityTypeEnum("related_entity_type"),
  relatedEntityId: integer("related_entity_id"),
  actionUrl: varchar("action_url", { length: 500 }),
  createdById: integer("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

export const userNotification = pgTable("user_notification", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").notNull().references(() => notification.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => user.id),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  sentViaEmail: boolean("sent_via_email").notNull().default(false),
  emailSentAt: timestamp("email_sent_at"),
  emailError: text("email_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => /* @__PURE__ */ new Date()).defaultNow(),
});

// ============================================================================
// JOIN TABLES (Many-to-Many)
// ============================================================================

export const ticketTag = pgTable("ticket_tag", {
  ticketId: integer("ticket_id").notNull().references(() => ticket.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tag.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.ticketId, table.tagId] }),
}));

export const taskTag = pgTable("task_tag", {
  taskId: integer("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tag.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.tagId] }),
}));
