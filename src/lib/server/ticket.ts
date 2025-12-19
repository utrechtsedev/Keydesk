import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { TicketConfig } from "$lib/types";
import { eq, desc } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { sql } from 'drizzle-orm';

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
  
  // Get next number from sequence (thread-safe, no race conditions)
  const [result] = await database.execute<{ nextval: number }>(
    sql`SELECT nextval('ticket_number_seq')::int as nextval`
  );
 
  const nextNumber = result.nextval;
  const prefix = await getTicketPrefix();
  
  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}


/**
 * Creates the sequence if it doesn't exist and initializes it
 */
export async function ensureTicketSequence(): Promise<void> {
  try {
    // Create sequence if it doesn't exist
    await db.execute(
      sql`CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1`
    );

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
        .where(eq(schema.config.key, "tickets"));

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
