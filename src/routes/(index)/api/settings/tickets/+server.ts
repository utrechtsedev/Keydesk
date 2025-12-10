import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { TicketConfig } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { tickets } = await request.json() as { tickets: TicketConfig };

    if (!tickets) {
      return error(400, { message: 'Ticket settings are required.' });
    }

    if (!tickets.ticketPrefix || !tickets.nextTicketNumber) {
      return error(400, { message: 'Ticket prefix and next number are required' });
    }

    const [config] = await db
      .insert(schema.config)
      .values({
        key: 'tickets',
        value: tickets
      })
      .onConflictDoUpdate({
        target: schema.config.key,
        set: {
          value: tickets,
          updatedAt: new Date()
        }
      })
      .returning();

    const created = config.createdAt.getTime() === config.updatedAt.getTime();

    return json({
      success: true,
      data: config.value,
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving tickets settings:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save tickets settings',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const [config] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'tickets'));

    if (!config) {
      return json({
        success: true,
        data: null,
      });
    }

    return json({
      success: true,
      data: config.value
    });

  } catch (err) {
    return json(
      {
        success: false,
        message: 'Failed to fetch tickets settings',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
