import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
	user,
	session,
	account,
	verification,
	config,
	image,
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
	email,
	ticketTag,
	taskTag
} from './tables';

// ============================================================================
// USER & AUTH SCHEMAS
// ============================================================================

export const insertUserSchema = createInsertSchema(user, {
	name: z.string().min(1, 'Name is required').max(255),
	email: z.email('Invalid email address').max(255),
	emailVerified: z.boolean().default(false),
	image: z.url('Invalid image URL').max(500).nullable().optional(),
	role: z.string().max(50).nullable().optional(),
	banned: z.boolean().default(false).optional(),
	banReason: z.string().nullable().optional(),
	banExpires: z.date().nullable().optional(),
	notificationPreferences: z.object({
		email: z.boolean().default(true),
		dashboard: z.boolean().default(true),
		ticketUpdates: z.boolean().default(true),
		taskAssignments: z.boolean().default(true),
		mentions: z.boolean().default(true)
	})
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateUserSchema = insertUserSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});
export const publicUserSchema = createSelectSchema(user).pick({
	id: true,
	name: true,
	email: true,
	image: true,
	role: true,
	createdAt: true
});

export const insertSessionSchema = createInsertSchema(session, {
	token: z.string().min(1).max(500),
	expiresAt: z.date().min(new Date(), 'Expiry date must be in the future'),
	ipAddress: z.union([z.ipv4(), z.ipv6()]),
	userAgent: z.string().max(500).nullable().optional(),
	userId: z.number().int().positive(),
	impersonatedBy: z.string().max(255).nullable().optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const insertAccountSchema = createInsertSchema(account, {
	accountId: z.string().min(1).max(255),
	providerId: z.string().min(1).max(100),
	userId: z.number().int().positive(),
	scope: z.string().max(500).nullable().optional(),
	password: z.string().min(8).max(255).nullable().optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const insertVerificationSchema = createInsertSchema(verification, {
	identifier: z.string().min(1).max(255),
	value: z.string().min(1).max(500),
	expiresAt: z.date().min(new Date(), 'Expiry date must be in the future')
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

// ============================================================================
// APPLICATION SCHEMAS
// ============================================================================

export const insertConfigSchema = createInsertSchema(config, {
	key: z.string().min(1).max(100),
	value: z.json()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateConfigSchema = insertConfigSchema.partial().required({ key: true });

export const insertImageSchema = createInsertSchema(image, {
	fileName: z.string().min(1).max(255),
	mimeType: z
		.string()
		.regex(/^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/, 'Invalid image MIME type')
		.max(100),
	fileData: z.instanceof(Buffer)
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const insertRequesterSchema = createInsertSchema(requester, {
	name: z.string().min(1).max(100).nullable().optional(),
	email: z.email('Invalid email address').max(100),
	phone: z
		.string()
		.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
		.max(20)
		.nullable()
		.optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateRequesterSchema = insertRequesterSchema.partial().required({ email: true });

export const insertCategorySchema = createInsertSchema(category, {
	name: z.string().min(1, 'Category name is required').max(50),
	description: z.string().nullable().optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateCategorySchema = insertCategorySchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

export const insertStatusSchema = createInsertSchema(status, {
	name: z.string().min(1, 'Status name is required').max(50),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')
		.length(7),
	isResolved: z.boolean().default(false).optional(),
	isDefault: z.boolean().default(false).optional(),
	isClosed: z.boolean().default(false).optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateStatusSchema = insertStatusSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});
export const insertPrioritySchema = createInsertSchema(priority, {
	name: z.string().min(1, 'Priority name is required').max(50),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')
		.length(7),
	isDefault: z.boolean().default(false).optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updatePrioritySchema = insertPrioritySchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});
export const insertTagSchema = createInsertSchema(tag, {
	name: z.string().min(1, 'Tag name is required').max(100).trim()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateTagSchema = insertTagSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

// ============================================================================
// TICKET SCHEMAS
// ============================================================================

export const insertTicketSchema = createInsertSchema(ticket, {
	requesterId: z.number().int().positive(),
	assigneeId: z.number().int().positive().nullable().optional(),
	subject: z.string().min(1, 'Subject is required').max(500),
	channel: z.enum(['email', 'portal', 'user', 'dashboard']),
	statusId: z.number().int().positive(),
	priorityId: z.number().int().positive(),
	categoryId: z.number().int().positive().nullable().optional(),
	targetDate: z.date().min(new Date(), 'Target date must be in the future'),
	responseCount: z.number().int().min(1).default(1).optional()
}).omit({
	id: true,
	ticketNumber: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
	firstResponseAt: true,
	resolvedAt: true,
	closedAt: true,
	lastUserResponseAt: true,
	lastRequesterResponseAt: true
});

export const updateTicketSchema = insertTicketSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

export const insertTicketMessageSchema = createInsertSchema(ticketMessage, {
	ticketId: z.number().int().positive(),
	senderType: z.enum(['requester', 'user', 'system']),
	requesterId: z.number().int().positive().nullable().optional(),
	senderName: z.string().max(100).nullable().optional(),
	senderEmail: z.email().max(255).nullable().optional(),
	userId: z.number().int().positive().nullable().optional(),
	message: z.string().min(1, 'Message cannot be empty'),
	isPrivate: z.boolean().default(false),
	channel: z.enum(['email', 'portal', 'system', 'api', 'dashboard']),
	isFirstResponse: z.boolean().default(false).optional(),
	hasAttachments: z.boolean().default(false).optional()
})
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.refine(
		(data) => {
			// If sender is requester, requesterId must be provided
			if (data.senderType === 'requester') {
				return data.requesterId !== null && data.requesterId !== undefined;
			}
			// If sender is user, userId must be provided
			if (data.senderType === 'user') {
				return data.userId !== null && data.userId !== undefined;
			}
			return true;
		},
		{
			message: 'Sender ID is required based on sender type'
		}
	);

export const insertTicketAttachmentSchema = createInsertSchema(ticketAttachment, {
	ticketId: z.number().int().positive(),
	messageId: z.number().int().positive().nullable().optional(),
	fileName: z.string().min(1).max(255),
	originalFileName: z.string().min(1).max(255),
	filePath: z.string().min(1).max(500),
	fileSize: z.number().int().positive().max(10485760, 'File size must not exceed 10MB'),
	mimeType: z.string().max(100),
	uploadedByType: z.enum(['requester', 'user']),
	uploadedById: z.number().int().positive(),
	uploadedByName: z.string().min(1).max(100),
	downloadCount: z.number().int().min(0).default(0).optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const insertTicketTagSchema = createInsertSchema(ticketTag, {
	ticketId: z.number().int().positive(),
	tagId: z.number().int().positive()
}).omit({
	createdAt: true
});

export const createTicketFormSchema = z.object({
	subject: z.string().min(1, 'Subject is required').max(500).trim(),
	message: z.string().min(1, 'Message is required').trim(),
	isPrivate: z
		.string()
		.transform((val) => {
			try {
				return JSON.parse(val);
			} catch {
				throw new Error('Invalid boolean format');
			}
		})
		.pipe(z.boolean()),
	requesterId: z.coerce.number().int().positive('Valid requester ID is required'),
	priorityId: z.coerce.number().int().positive('Valid priority ID is required'),
	statusId: z.coerce.number().int().positive('Valid status ID is required'),
	assigneeId: z
		.string()
		.optional()
		.transform((val) => (val && val !== '' ? parseInt(val) : null))
		.pipe(z.number().int().positive().nullable()),
	categoryId: z
		.string()
		.optional()
		.transform((val) => (val && val !== '' ? parseInt(val) : null))
		.pipe(z.number().int().positive().nullable()),
	channel: z.enum(['email', 'portal', 'user', 'dashboard']).default('portal'),
	targetDate: z.string().min(1, 'Target date is required').pipe(z.coerce.date()),
	tags: z.preprocess(
		(val) => {
			if (Array.isArray(val)) return val;
			if (typeof val === 'string') {
				try {
					return JSON.parse(val);
				} catch {
					return [];
				}
			}
			return [];
		},
		z.array(z.string().trim().min(1, 'Tag name cannot be empty')).default([])
	),
	files: z
		.array(z.instanceof(File))
		.optional()
		.default([])
		.refine((files) => files.every((file) => file.size <= 157286400), {
			message: 'Each file must be under 150MB'
		})
		.refine((files) => files.length <= 10, { message: 'Maximum 10 files allowed' })
});

export const addTicketMessageFormSchema = z.object({
	message: z.string().min(1, 'Message is required').trim(),
	isPrivate: z
		.string()
		.transform((val) => val === 'true')
		.pipe(z.boolean()),
	ticketId: z.coerce.number().int().positive('Valid ticket ID is required'),
	files: z
		.array(z.instanceof(File))
		.optional()
		.default([])
		.refine((files) => files.every((file) => file.size <= 10485760), {
			message: 'Each file must be under 10MB'
		})
		.refine((files) => files.length <= 10, { message: 'Maximum 10 files allowed' })
});

export const bulkAssignmentSchema = z.object({
	ids: z.array(z.number().int().positive()).min(1, 'At least one ticket ID required'),
	itemId: z.number().int().positive('Valid item ID is required'),
	itemType: z.enum(['user', 'category', 'status', 'priority', 'tag'])
});

export const idsBulkSchema = z.object({
	ids: z.array(z.number().int().positive()).min(1, 'At least one ID required')
});

export const ticketExportQuerySchema = z
	.object({
		search: z.string().optional(),
		status: z.coerce.number().int().positive().optional(),
		priority: z.coerce.number().int().positive().optional(),
		category: z.coerce.number().int().positive().optional(),
		assignee: z
			.string()
			.optional()
			.refine((val) => !val || val === 'unassigned' || !isNaN(parseInt(val)), {
				message: 'Assignee must be a number or "unassigned"'
			})
			.transform((val) => {
				if (!val) return undefined;
				if (val === 'unassigned') return 'unassigned' as const;
				return parseInt(val);
			}),
		dateFrom: z.coerce.date().optional(),
		dateTo: z.coerce.date().optional(),
		includeResolved: z
			.string()
			.optional()
			.transform((val) => val !== 'false') // default true
			.pipe(z.boolean())
	})
	.refine(
		(data) => {
			// If both dates provided, dateFrom must be before dateTo
			if (data.dateFrom && data.dateTo) {
				return data.dateFrom <= data.dateTo;
			}
			return true;
		},
		{
			message: 'dateFrom must be before or equal to dateTo',
			path: ['dateFrom']
		}
	);

export const setTagsSchema = z.object({
	tags: z.array(z.string().trim().min(1, 'Tag name cannot be empty')).default([])
});

export const setTagSchema = z.object({
	tag: z.string().trim().min(1, 'Tag name cannot be empty')
});

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const insertTaskSchema = createInsertSchema(task, {
	title: z.string().min(1, 'Title is required').max(255),
	description: z.string().nullable().optional(),
	ticketId: z.number().int().positive().nullable().optional(),
	parentTaskId: z.number().int().positive().nullable().optional(),
	createdById: z.number().int().positive().nullable().optional(),
	assigneeId: z.number().int().positive().nullable().optional(),
	statusId: z.number().int().positive(),
	priorityId: z.number().int().positive(),
	dueDate: z.coerce.date().optional(),
	startDate: z.coerce.date().nullable().optional(),
	position: z.number().int().min(0).default(0).optional()
})
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
		deletedAt: true,
		completedAt: true
	})
	.refine(
		(data) => {
			// If startDate exists, it must be before dueDate
			if (data.startDate && data.dueDate) {
				return data.startDate <= data.dueDate;
			}
			return true;
		},
		{
			message: 'Start date must be before due date',
			path: ['startDate']
		}
	);

export const updateTaskSchema = insertTaskSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

export const insertTaskTagSchema = createInsertSchema(taskTag, {
	taskId: z.number().int().positive(),
	tagId: z.number().int().positive()
}).omit({
	createdAt: true
});

export const createTaskSchema = insertTaskSchema.safeExtend({
	tags: z.array(z.string().trim().min(1, 'Tag name cannot be empty')).default([])
});

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const insertNotificationSchema = createInsertSchema(notification, {
	title: z.string().min(1, 'Title is required').max(255),
	message: z.string().min(1, 'Message is required'),
	type: z.enum(['info', 'success', 'warning', 'error', 'ticket', 'task', 'system']).default('info'),
	channel: z.enum(['dashboard', 'email']).default('dashboard'),
	relatedEntityType: z.enum(['ticket', 'task', 'user', 'system']).nullable().optional(),
	relatedEntityId: z.number().int().positive().nullable().optional(),
	actionUrl: z.url('Invalid URL').max(500).nullable().optional(),
	createdById: z.number().int().positive().nullable().optional()
})
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.refine(
		(data) => {
			// If relatedEntityType exists, relatedEntityId must also exist
			if (data.relatedEntityType) {
				return data.relatedEntityId !== null && data.relatedEntityId !== undefined;
			}
			return true;
		},
		{
			message: 'Related entity ID is required when entity type is specified',
			path: ['relatedEntityId']
		}
	);

export const insertUserNotificationSchema = createInsertSchema(userNotification, {
	notificationId: z.number().int().positive(),
	userId: z.number().int().positive(),
	isRead: z.boolean().default(false).optional(),
	sentViaEmail: z.boolean().default(false),
	emailError: z.string().max(1000).nullable().optional()
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	readAt: true,
	emailSentAt: true
});

export const updateUserNotificationSchema = insertUserNotificationSchema.pick({
	isRead: true
});

// ============================================================================
// EMAIL SCHEMAS
// ============================================================================

export const insertEmailSchema = createInsertSchema(email, {
	uid: z.number().int().positive(),
	fromAddress: z.email('Invalid email address').max(255),
	fromName: z.string().max(255).nullable().optional(),
	subject: z.string().min(1, 'Subject is required').max(500),
	textContent: z.string().nullable().optional(),
	htmlContent: z.string().nullable().optional(),
	rawSource: z.string().nullable().optional(),
	receivedAt: z
		.date()
		.default(() => new Date())
		.optional(),
	size: z.number().int().positive().nullable().optional(),
	hasAttachments: z.boolean().default(false).optional(),
	processed: z.boolean().default(false).optional(),
	processingError: z.string().nullable().optional(),
	ticketId: z.number().int().positive().nullable().optional(),
	requesterId: z.number().int().positive().nullable().optional(),
	ticketMessageId: z.number().int().positive().nullable().optional()
}).omit({
	id: true,
	createdAt: true,
	processedAt: true
});

export const updateEmailProcessingSchema = createInsertSchema(email)
	.pick({
		processed: true,
		processedAt: true,
		processingError: true,
		ticketId: true,
		requesterId: true,
		ticketMessageId: true
	})
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});
// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

// Pagination schema
export const paginationSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20)
});

// Sort schema
export const sortSchema = z.object({
	field: z.string(),
	order: z.enum(['asc', 'desc']).default('desc')
});

// Filter schema for tickets
export const ticketFilterSchema = z.object({
	statusId: z.number().int().positive().optional(),
	priorityId: z.number().int().positive().optional(),
	categoryId: z.number().int().positive().optional(),
	assigneeId: z.number().int().positive().optional(),
	requesterId: z.number().int().positive().optional(),
	channel: z.enum(['email', 'portal', 'user', 'dashboard']).optional(),
	searchTerm: z.string().optional(),
	dateFrom: z.date().optional(),
	dateTo: z.date().optional(),
	tags: z.array(z.number().int().positive()).optional()
});

// Filter schema for tasks
export const taskFilterSchema = z.object({
	statusId: z.number().int().positive().optional(),
	priorityId: z.number().int().positive().optional(),
	assigneeId: z.number().int().positive().optional(),
	ticketId: z.number().int().positive().optional(),
	parentTaskId: z.number().int().positive().optional(),
	searchTerm: z.string().optional(),
	dueDateFrom: z.date().optional(),
	dueDateTo: z.date().optional(),
	tags: z.array(z.number().int().positive()).optional()
});

// ID parameter schema
export const idParamSchema = z.object({
	id: z.coerce.number().int().positive()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
//
export function validate<T extends z.ZodTypeAny>(schema: T) {
	return async (request: Request) => {
		const body = await request.json();
		return schema.parse(body); // Throws if invalid
	};
}
export function parseFormData(formData: FormData) {
	const data: Record<string, unknown> = {};

	for (const [key, value] of formData.entries()) {
		if (key === 'files') continue; // Handle files separately
		data[key] = value;
	}

	const files = formData.getAll('files').filter((file): file is File => file instanceof File);
	data.files = files;

	return data;
}

export function parseSearchParams(searchParams: URLSearchParams): Record<string, unknown> {
	const data: Record<string, unknown> = {};

	for (const [key, value] of searchParams.entries()) {
		data[key] = value;
	}

	return data;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

// Export inferred types for use in your application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type UpdateTicket = z.infer<typeof updateTicketSchema>;

export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type InsertTicketAttachment = z.infer<typeof insertTicketAttachmentSchema>;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;

export type InsertRequester = z.infer<typeof insertRequesterSchema>;
export type UpdateRequester = z.infer<typeof updateRequesterSchema>;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type InsertPriority = z.infer<typeof insertPrioritySchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type TicketFilter = z.infer<typeof ticketFilterSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type Sort = z.infer<typeof sortSchema>;
