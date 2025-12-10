import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { TicketConfig } from "$lib/types";
import { eq, desc } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

type DrizzleTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  any
>;

export async function getTicketPrefix(): Promise<string> {
  const [ticketConfig] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'tickets'));

  if (!ticketConfig) return 'TKT-';

  const configValue = ticketConfig.value as TicketConfig;
  return configValue.ticketPrefix;
}

export async function generateTicketNumber(tx?: DrizzleTransaction): Promise<string> {
  const database = tx || db;

  try {
    // Get the last ticket with row locking
    const [lastTicket] = await database
      .select({ ticketNumber: schema.ticket.ticketNumber })
      .from(schema.ticket)
      .orderBy(desc(schema.ticket.id))
      .limit(1)
      .for('update');

    let nextNumber: number;

    // Get starting ticket number from config
    const [startTicketingAt] = await database
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, "tickets"));

    if (!startTicketingAt) {
      nextNumber = 1;
    } else {
      const configValue = startTicketingAt.value as TicketConfig;
      nextNumber = configValue.nextTicketNumber;
    }

    // Extract number from last ticket if it exists
    if (lastTicket?.ticketNumber) {
      const match = lastTicket.ticketNumber.match(/\d+/);
      if (match) nextNumber = parseInt(match[0]) + 1;
    }

    const prefix = await getTicketPrefix();
    const ticketNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;

    return ticketNumber;
  } catch (error) {
    throw error;
  }
}
