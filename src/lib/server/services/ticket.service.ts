import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { sendNotification, ticketNotification } from '$lib/server/queue';
import type { Ticket, User } from '$lib/types';
import { logger } from '$lib/server/logger';
import type { TicketConfig } from '$lib/types';
import { eq, desc } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

type DrizzleTransaction = PgTransaction<PostgresJsQueryResultHKT, typeof schema, any>;

class TicketService {
	/**
	 * Create a new ticket
	 */
	async create(data: schema.NewTicket, user: User): Promise<Ticket> {
		const ticketNumber = await this.generateTicketNumber();

		const [ticket] = await db
			.insert(schema.ticket)
			.values({
				...data,
				ticketNumber
			})
			.returning();

		// Fetch with all relations
		const newTicket = await db.query.ticket.findFirst({
			where: eq(schema.ticket.id, ticket.id),
			with: {
				status: true,
				priority: true,
				category: true,
				assignee: true,
				requester: true
			}
		});

		if (!newTicket) {
			throw new Error('Failed to fetch created ticket');
		}
		if (newTicket.assigneeId && newTicket.assigneeId !== user.id) {
			try {
				await sendNotification({
					title: 'Ticket assigned to you',
					message: `New ticket assigned by ${user.name}: ${newTicket.subject}`,
					recipient: { userId: newTicket.assigneeId },
					channels: ['dashboard', 'email'],
					notification: {
						type: 'entity',
						event: 'assigned',
						entity: {
							type: 'ticket',
							data: newTicket as Ticket
						}
					}
				});
			} catch (error) {
				logger.error({ error, ticketId: ticket.id }, 'Failed to queue assignee notification');
			}
		}

		return newTicket as Ticket;
	}

	/**
	 * Update an existing ticket
	 */
	async update(ticketId: number, updates: Partial<Ticket>, user: User): Promise<Ticket> {
		// Fetch old ticket with all relations
		const oldTicket = await db.query.ticket.findFirst({
			where: eq(schema.ticket.id, ticketId),
			with: {
				status: true,
				priority: true,
				category: true,
				assignee: true,
				requester: true
			}
		});

		if (!oldTicket) {
			throw new Error(`Ticket with ID ${ticketId} not found`);
		}

		// Update ticket
		await db.update(schema.ticket).set(updates).where(eq(schema.ticket.id, ticketId));

		// Fetch new ticket with all relations
		const newTicket = await db.query.ticket.findFirst({
			where: eq(schema.ticket.id, ticketId),
			with: {
				status: true,
				priority: true,
				category: true,
				assignee: true,
				requester: true
			}
		});

		if (!newTicket) {
			throw new Error('Failed to fetch updated ticket');
		}

		try {
			await ticketNotification(oldTicket as Ticket, newTicket as Ticket, user);
		} catch (error) {
			logger.error({ error, ticketId }, 'Failed to queue ticket update notifications');
		}

		return newTicket as Ticket;
	}
	/**
	 * Fetch Ticket prefix
	 */
	public async getTicketPrefix(): Promise<string> {
		const [ticketConfig] = await db
			.select()
			.from(schema.config)
			.where(eq(schema.config.key, 'tickets'));

		if (!ticketConfig) return 'TKT-';

		const configValue = ticketConfig.value as TicketConfig;
		return configValue.ticketPrefix;
	}
	/**
	 * Generate unique ticket number
	 */
	public async generateTicketNumber(tx?: DrizzleTransaction): Promise<string> {
		const database = tx || db;

		// Get next number from sequence (thread-safe, no race conditions)
		const [result] = await database.execute<{ nextval: number }>(
			sql`SELECT nextval('ticket_number_seq')::int as nextval`
		);

		const nextNumber = result.nextval;
		const prefix = await this.getTicketPrefix();

		return `${prefix}${String(nextNumber).padStart(5, '0')}`;
	}
	/**
	 * Ensure ticket sequence in PostgreSQL db
	 */
	public async ensureTicketSequence(): Promise<void> {
		try {
			// Create sequence if it doesn't exist
			await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1`);

			// Check if sequence needs initialization (only run once)
			const seqCheck = await db.execute<{ last_value: number; is_called: boolean }>(
				sql`SELECT last_value, is_called FROM ticket_number_seq`
			);

			// Access the first row from the rows array
			const seqData = seqCheck.rows[0];

			// If sequence has never been used (is_called = false and last_value = 1), initialize it
			if (!seqData.is_called && seqData.last_value === 1) {
				// Get the last ticket number from database
				const [lastTicket] = await db
					.select({ ticketNumber: schema.ticket.ticketNumber })
					.from(schema.ticket)
					.orderBy(desc(schema.ticket.id))
					.limit(1);

				let maxExistingNumber = 0;
				if (lastTicket?.ticketNumber) {
					const match = lastTicket.ticketNumber.match(/\d+/);
					if (match) {
						maxExistingNumber = parseInt(match[0]);
					}
				}

				// Get starting number from config
				const [config] = await db
					.select()
					.from(schema.config)
					.where(eq(schema.config.key, 'tickets'));

				let configStartNumber = 1;
				if (config) {
					const configValue = config.value as TicketConfig;
					configStartNumber = configValue.nextTicketNumber || 1;
				}

				// Use whichever is higher: last ticket + 1, or config value
				const nextNumber = Math.max(maxExistingNumber + 1, configStartNumber);

				// Set sequence to this value (false = next call will return this number)
				await db.execute(sql`SELECT setval('ticket_number_seq', ${nextNumber}, false)`);

				console.log(`✓ Ticket sequence initialized to start at: ${nextNumber}`);
			}
		} catch (error) {
			console.error('Failed to ensure ticket sequence:', error);
			throw error;
		}
	}
}

export const ticketService = new TicketService();
