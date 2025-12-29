import { TICKET_CHANGE_RULES, TASK_CHANGE_RULES } from './message.rules';
import type {
	Ticket,
	Task,
	User,
	NotificationPreferences,
	NotificationSettings,
	NotificationOptions,
	Organization
} from '$lib/types';
import { logger } from '$lib/server/logger';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { generateEmailTemplate, sendEmail } from '$lib/server/email';

class NotificationService {
	/**
	 * Handler for sending notifications
	 */
	async sendNotification(options: NotificationOptions): Promise<void> {
		try {
			const [getOrganization] = await db
				.select()
				.from(schema.config)
				.where(eq(schema.config.key, 'organization'));

			if (!getOrganization) {
				throw new Error('Could not send notification. Organization configuration not found.');
			}

			const organization: Organization = getOrganization.value as Organization;

			// Handle external email notifications (non-user recipients)
			if ('email' in options.recipient) {
				return await this.sendExternalEmailNotification(options, organization);
			}

			// Handle user notifications
			const users = await this.fetchUsers(options);

			if (users.length === 0) {
				logger.warn('No users found for notification');
				return;
			}

			await this.processUserNotifications(users, options, organization);
		} catch (error) {
			logger.error({ error }, 'Error in sendNotification');
			throw error;
		}
	}

	async handleTicketUpdate(oldTicket: Ticket, newTicket: Ticket, user: User) {
		if (!oldTicket.category || !oldTicket.priority || !oldTicket.status || !oldTicket.assignee) {
			throw new Error(
				`Old ticket missing required relations. Ticket ID: ${oldTicket.id}. ` +
					`Missing: ${[
						!oldTicket.category && 'category',
						!oldTicket.priority && 'priority',
						!oldTicket.status && 'status',
						!oldTicket.assignee && 'assignee'
					]
						.filter(Boolean)
						.join(', ')}`
			);
		}
		if (!newTicket.category || !newTicket.priority || !newTicket.status || !newTicket.assignee) {
			throw new Error(
				`New ticket missing required relations. Ticket ID: ${newTicket.id}. ` +
					`Missing: ${[
						!newTicket.category && 'category',
						!newTicket.priority && 'priority',
						!newTicket.status && 'status',
						!newTicket.assignee && 'assignee'
					]
						.filter(Boolean)
						.join(', ')}`
			);
		}

		for (const [field, rules] of Object.entries(TICKET_CHANGE_RULES)) {
			const oldValue = oldTicket[field as keyof Ticket];
			const newValue = newTicket[field as keyof Ticket];

			if (oldValue === newValue) continue;

			// Special handling for assigneeId: send TWO notifications when changing from person to person
			if (field === 'assigneeId' && oldValue && newValue) {
				// Notify old assignee (unassigned)
				if (oldTicket.assigneeId !== user.id && rules.removed) {
					const unassignNotification = rules.removed(oldTicket, newTicket, user);
					try {
						await this.sendNotification({
							title: unassignNotification.title,
							message: unassignNotification.message,
							recipient: { userId: oldTicket.assigneeId! },
							channels: ['dashboard', 'email'],
							notification: {
								type: 'entity',
								event: unassignNotification.event,
								entity: {
									type: 'ticket',
									data: newTicket
								}
							}
						});
					} catch (error) {
						logger.error(
							{ error, field, ticketId: newTicket.id },
							'Failed to send unassign notification'
						);
					}
				}

				// Notify new assignee (assigned)
				if (newTicket.assigneeId !== user.id && rules.added) {
					const assignNotification = rules.added(oldTicket, newTicket, user);
					try {
						await this.sendNotification({
							title: assignNotification.title,
							message: assignNotification.message,
							recipient: { userId: newTicket.assigneeId! },
							channels: ['dashboard', 'email'],
							notification: {
								type: 'entity',
								event: assignNotification.event,
								entity: {
									type: 'ticket',
									data: newTicket
								}
							}
						});
					} catch (error) {
						logger.error(
							{ error, field, ticketId: newTicket.id },
							'Failed to send assign notification'
						);
					}
				}
				continue;
			}

			// Normal processing for other fields
			let rule;
			if (!oldValue) rule = rules.added;
			else if (!newValue) rule = rules.removed;
			else rule = rules.changed;

			if (!rule) continue;

			const notification = rule(oldTicket, newTicket, user);

			let recipientUserId: number | null = null;

			if (field === 'assigneeId') {
				if (rules.added || rules.changed) {
					recipientUserId = newTicket.assigneeId;
				} else if (rules.removed) {
					recipientUserId = oldTicket.assigneeId;
				}
			} else {
				recipientUserId = newTicket.assigneeId;
			}

			if (!recipientUserId || recipientUserId === user.id) {
				continue;
			}

			const event = notification.isClosing ? 'closed' : notification.event;

			try {
				await this.sendNotification({
					title: notification.title,
					message: notification.message,
					recipient: { userId: recipientUserId },
					channels: ['dashboard', 'email'],
					notification: {
						type: 'entity',
						event: event,
						entity: {
							type: 'ticket',
							data: newTicket
						}
					}
				});
			} catch (error) {
				logger.error({ error, field, ticketId: newTicket.id }, 'Failed to send notification');
			}
		}
	}

	async handleTaskUpdate(oldTask: Task, newTask: Task, user: User) {
		if (!oldTask.priority || !oldTask.status || !oldTask.assignee) {
			throw new Error(
				`Old task missing required relations. Task ID: ${oldTask.id}. ` +
					`Missing: ${[
						!oldTask.priority && 'priority',
						!oldTask.status && 'status',
						!oldTask.assignee && 'assignee'
					]
						.filter(Boolean)
						.join(', ')}`
			);
		}
		if (!newTask.priority || !newTask.status || !newTask.assignee) {
			throw new Error(
				`New task missing required relations. Task ID: ${newTask.id}. ` +
					`Missing: ${[
						!newTask.priority && 'priority',
						!newTask.status && 'status',
						!newTask.assignee && 'assignee'
					]
						.filter(Boolean)
						.join(', ')}`
			);
		}

		for (const [field, rules] of Object.entries(TASK_CHANGE_RULES)) {
			const oldValue = oldTask[field as keyof Task];
			const newValue = newTask[field as keyof Task];

			if (oldValue === newValue) continue;

			if (field === 'assigneeId' && oldValue && newValue) {
				if (oldTask.assigneeId !== user.id && rules.removed) {
					const unassignNotification = rules.removed(oldTask, newTask, user);
					try {
						await this.sendNotification({
							title: unassignNotification.title,
							message: unassignNotification.message,
							recipient: { userId: oldTask.assigneeId! },
							channels: ['dashboard', 'email'],
							notification: {
								type: 'entity',
								event: unassignNotification.event,
								entity: {
									type: 'task',
									data: newTask
								}
							}
						});
					} catch (error) {
						logger.error(
							{ error, field, taskId: newTask.id },
							'Failed to send unassign notification'
						);
					}
				}

				if (newTask.assigneeId !== user.id && rules.added) {
					const assignNotification = rules.added(oldTask, newTask, user);
					try {
						await this.sendNotification({
							title: assignNotification.title,
							message: assignNotification.message,
							recipient: { userId: newTask.assigneeId! },
							channels: ['dashboard', 'email'],
							notification: {
								type: 'entity',
								event: assignNotification.event,
								entity: {
									type: 'task',
									data: newTask
								}
							}
						});
					} catch (error) {
						logger.error(
							{ error, field, taskId: newTask.id },
							'Failed to send assign notification'
						);
					}
				}
				continue;
			}

			let rule;
			if (!oldValue) rule = rules.added;
			else if (!newValue) rule = rules.removed;
			else rule = rules.changed;

			if (!rule) continue;

			const notification = rule(oldTask, newTask, user);

			let recipientUserId: number | null = null;

			if (field === 'assigneeId') {
				if (rules.added || rules.changed) {
					recipientUserId = newTask.assigneeId;
				} else if (rules.removed) {
					recipientUserId = oldTask.assigneeId;
				}
			} else {
				recipientUserId = newTask.assigneeId;
			}

			if (!recipientUserId || recipientUserId === user.id) {
				continue;
			}

			try {
				await this.sendNotification({
					title: notification.title,
					message: notification.message,
					recipient: { userId: recipientUserId },
					channels: ['dashboard', 'email'],
					notification: {
						type: 'entity',
						event: notification.event,
						entity: {
							type: 'task',
							data: newTask
						}
					}
				});
			} catch (error) {
				logger.error({ error, field, taskId: newTask.id }, 'Failed to send notification');
			}
		}
	}

	/**
	 * Process notifications for internal users
	 */
	private async processUserNotifications(
		users: (typeof schema.user.$inferSelect)[],
		options: NotificationOptions,
		organization: Organization
	): Promise<void> {
		const [adminSettingsConfig] = await db
			.select()
			.from(schema.config)
			.where(eq(schema.config.key, 'notifications'));

		const adminSettings: NotificationSettings = adminSettingsConfig?.value as NotificationSettings;

		const { relatedEntityType, relatedEntityId, notificationType } =
			this.extractNotificationData(options);

		const batchSize = 10;
		for (let i = 0; i < users.length; i += batchSize) {
			const batch = users.slice(i, i + batchSize);

			await Promise.allSettled(
				batch.map(async (user) => {
					try {
						for (const channel of options.channels) {
							const shouldSend = this.shouldSendNotification({
								adminSettings,
								user,
								options,
								channel
							});

							if (!shouldSend) {
								logger.info(`${channel} notification skipped for ${user.email} based on settings`);
								continue;
							}

							const actionUrl = this.generateActionUrl(options);

							const [notification] = await db
								.insert(schema.notification)
								.values({
									title: options.title,
									message: options.message,
									type: notificationType,
									channel: channel,
									relatedEntityType: relatedEntityType,
									relatedEntityId: relatedEntityId,
									actionUrl: actionUrl
								})
								.returning();

							await db.insert(schema.userNotification).values({
								notificationId: notification.id,
								userId: user.id,
								isRead: false,
								sentViaEmail: channel === 'email'
							});

							if (channel === 'email') {
								try {
									const emailHtml = generateEmailTemplate({
										options,
										organization,
										recipientEmail: user.email,
										actionUrl
									});

									await sendEmail(user.email, options.title, emailHtml);
									logger.info(`Email sent successfully to ${user.email}`);
								} catch (emailError) {
									logger.error(
										{ err: emailError, userId: user.id },
										`Failed to send email to ${user.email}`
									);
								}
							} else {
								logger.info(`Dashboard notification sent to ${user.email}`);
							}
						}
					} catch (error) {
						logger.error(
							{ err: error, userId: user.id },
							`Failed to process notification for ${user.email}`
						);
					}
				})
			);
		}
	}

	private async sendExternalEmailNotification(
		options: NotificationOptions,
		organization: Organization
	): Promise<void> {
		if (!('email' in options.recipient)) {
			throw new Error('Email recipient required for external notifications');
		}

		const [adminSettingsConfig] = await db
			.select()
			.from(schema.config)
			.where(eq(schema.config.key, 'notifications'));

		const adminSettings: NotificationSettings = adminSettingsConfig?.value as NotificationSettings;

		const shouldSend = this.shouldSendNotification({
			adminSettings,
			user: null,
			options,
			channel: 'email'
		});

		if (!shouldSend) {
			logger.info(
				`External email notification skipped for ${options.recipient.email} based on admin settings`
			);
			return;
		}

		const { relatedEntityType, relatedEntityId, notificationType } =
			this.extractNotificationData(options);
		const actionUrl = this.generateActionUrl(options, true);

		if (options.notification.type === 'entity') {
			await db.insert(schema.notification).values({
				title: options.title,
				message: options.message,
				type: notificationType,
				channel: 'email',
				relatedEntityType: relatedEntityType,
				relatedEntityId: relatedEntityId,
				actionUrl: actionUrl
			});
		}

		try {
			const emailHtml = generateEmailTemplate({
				options,
				organization,
				recipientEmail: options.recipient.email,
				actionUrl
			});

			await sendEmail(options.recipient.email, options.title, emailHtml);
			logger.info(`External email sent successfully to ${options.recipient.email}`);
		} catch (emailError) {
			logger.error(
				{ err: emailError, email: options.recipient.email },
				'Failed to send external email'
			);
			throw emailError;
		}
	}

	/**
	 * Fetch users based on recipient criteria
	 */
	private async fetchUsers(
		options: NotificationOptions
	): Promise<(typeof schema.user.$inferSelect)[]> {
		if ('userId' in options.recipient) {
			const [user] = await db
				.select()
				.from(schema.user)
				.where(eq(schema.user.id, options.recipient.userId));

			return user ? [user] : [];
		}

		if ('userIds' in options.recipient) {
			if (options.recipient.userIds.length === 0) return [];

			return await db
				.select()
				.from(schema.user)
				.where(inArray(schema.user.id, options.recipient.userIds));
		}

		if ('allUsers' in options.recipient) {
			return await db.select().from(schema.user);
		}

		return [];
	}

	/**
	 * Extract notification data for database storage
	 */
	private extractNotificationData(options: NotificationOptions): {
		relatedEntityType: 'ticket' | 'task' | 'user' | 'system' | null;
		relatedEntityId: number | null;
		notificationType: 'info' | 'success' | 'warning' | 'error' | 'ticket' | 'task' | 'system';
	} {
		if (options.notification.type === 'entity') {
			const entityType = options.notification.entity.type;
			const entityId = options.notification.entity.data.id;

			return {
				relatedEntityType: entityType,
				relatedEntityId: entityId,
				notificationType: entityType
			};
		}

		return {
			relatedEntityType: 'system',
			relatedEntityId: null,
			notificationType: options.notification.type
		};
	}

	/**
	 * Generate action URL based on notification type
	 */
	private generateActionUrl(options: NotificationOptions, external: boolean = false): string {
		const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';

		if (options.notification.type === 'entity') {
			const { entity } = options.notification;

			if (entity.type === 'ticket') {
				const ticketId = entity.data.id;
				if (external) {
					return `${baseUrl}/portal/tickets/${ticketId}`;
				}
				return `${baseUrl}/dashboard/tickets/${ticketId}`;
			}

			if (entity.type === 'task') {
				const taskId = entity.data.id;
				return `${baseUrl}/dashboard/tasks/${taskId}`;
			}
		}

		return `${baseUrl}/dashboard`;
	}

	/**
	 * Determines if a notification should be sent based on admin settings and user preferences
	 */
	private shouldSendNotification({
		adminSettings,
		user,
		options,
		channel
	}: {
		adminSettings: NotificationSettings;
		user: typeof schema.user.$inferSelect | null;
		options: NotificationOptions;
		channel: 'dashboard' | 'email';
	}): boolean {
		const isRequester = 'email' in options.recipient;
		const isAllUsers = 'allUsers' in options.recipient;
		const event = options.notification.event;
		const notificationType = options.notification.type;
		const userPreferences = user?.notificationPreferences as NotificationPreferences;

		if (notificationType !== 'entity') {
			return true;
		}

		if (channel === 'dashboard') {
			if (isRequester) return false;

			if (event === 'created' && isAllUsers) {
				const adminAllows = adminSettings.dashboard.notifyAllUsersOnNewTicket;
				if (!adminAllows) return false;

				if (userPreferences) {
					return userPreferences.dashboard.ticketCreated;
				}
				return true;
			}

			let adminAllows = false;
			switch (event) {
				case 'assigned':
					adminAllows = adminSettings.dashboard.item.assigned.notifyUser;
					break;
				case 'updated':
					adminAllows = adminSettings.dashboard.item.updated.notifyUser;
					break;
				case 'resolved':
					adminAllows = adminSettings.dashboard.item.resolved.notifyUser;
					break;
				case 'closed':
					adminAllows = adminSettings.dashboard.item.closed.notifyUser;
					break;
				default:
					adminAllows = false;
			}

			if (!adminAllows) return false;

			if (!userPreferences) return true;

			switch (event) {
				case 'created':
					return userPreferences.dashboard.ticketCreated;
				case 'assigned':
					return userPreferences.dashboard.itemAssigned;
				case 'updated':
					return userPreferences.dashboard.itemUpdated;
				case 'resolved':
				case 'closed':
					return userPreferences.dashboard.itemClosed;
				default:
					return true;
			}
		}

		if (channel === 'email') {
			if (event === 'created' && isAllUsers) {
				const adminAllows = adminSettings.email.notifyAllUsersOnNewTicket;
				if (!adminAllows) return false;

				if (userPreferences) {
					return userPreferences.email.ticketCreated;
				}
				return true;
			}

			let adminAllows = false;
			switch (event) {
				case 'created':
					adminAllows = isRequester ? adminSettings.email.item.created.notifyRequester : false;
					break;
				case 'assigned':
					adminAllows = isRequester
						? adminSettings.email.item.assigned.notifyRequester
						: adminSettings.email.item.assigned.notifyUser;
					break;
				case 'updated':
					adminAllows = isRequester
						? adminSettings.email.item.updated.notifyRequester
						: adminSettings.email.item.updated.notifyUser;
					break;
				case 'resolved':
					adminAllows = isRequester
						? adminSettings.email.item.resolved.notifyRequester
						: adminSettings.email.item.resolved.notifyUser;
					break;
				case 'closed':
					adminAllows = isRequester
						? adminSettings.email.item.closed.notifyRequester
						: adminSettings.email.item.closed.notifyUser;
					break;
				default:
					adminAllows = false;
			}

			if (!adminAllows) return false;

			if (isRequester) return true;

			if (!userPreferences) return false;

			switch (event) {
				case 'created':
					return userPreferences.email.ticketCreated;
				case 'assigned':
					return userPreferences.email.itemAssigned;
				case 'updated':
					return userPreferences.email.itemUpdated;
				case 'resolved':
				case 'closed':
					return userPreferences.email.itemClosed;
				default:
					return true;
			}
		}

		return false;
	}
}

export const notificationService = new NotificationService();
