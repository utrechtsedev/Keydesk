import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewPriority } from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { priorities } = await request.json() as { priorities: NewPriority[] };

    if (!priorities) {
      return error(400, { message: 'Priorities are required.' });
    }

    if (priorities.length < 1) {
      return error(400, { message: 'You must at least have 1 priority.' });
    }

    const defaultPriorities = priorities.filter((p) => p.isDefault);
    if (defaultPriorities.length !== 1) {
      return error(400, { message: 'You must only have 1 default priority.' });
    }

    // Bulk upsert
    const created = await db
      .insert(schema.priority)
      .values(priorities)
      .onConflictDoUpdate({
        target: schema.priority.id,
        set: {
          name: sql`EXCLUDED.name`,
          color: sql`EXCLUDED.color`,
          isDefault: sql`EXCLUDED.is_default`,
          order: sql`EXCLUDED.order`,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!created || created.length === 0) {
      return error(400, { message: 'Something went wrong while inserting fields into the database.' });
    }

    return json({
      success: true,
      data: created,
    }, { status: 201 });

  } catch (err) {
    console.error('Error saving priorities:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save priorities configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    const priorities = await db
      .select()
      .from(schema.priority);

    return json({
      success: true,
      data: priorities,
    });

  } catch (err) {
    return json(
      {
        success: false,
        message: 'Failed to fetch priorities',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { id } = await request.json() as { id: number };

    if (!id) {
      return json({
        success: false,
        message: 'Priority ID is required.'
      }, { status: 400 });
    }

    // Check if priority exists
    const [priority] = await db
      .select()
      .from(schema.priority)
      .where(eq(schema.priority.id, id));

    if (!priority) {
      return json({
        success: false,
        message: 'Priority not found.'
      }, { status: 404 });
    }

    // Check if it's the default priority
    if (priority.isDefault) {
      return json({
        success: false,
        message: 'Cannot delete the default priority. Set another priority as default first.'
      }, { status: 400 });
    }

    // Check if priority has associated tickets
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.ticket)
      .where(eq(schema.ticket.priorityId, id));

    if (Number(ticketCount.count) > 0) {
      return json({
        success: false,
        message: 'Cannot delete priority with associated tickets. Please reassign or delete all tickets first.'
      }, { status: 400 });
    }

    // Check if it's the last priority
    const [priorityCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.priority);

    if (Number(priorityCount.count) <= 1) {
      return json({
        success: false,
        message: 'Cannot delete the last priority. At least 1 priority is required.'
      }, { status: 400 });
    }

    // Delete the priority
    await db
      .delete(schema.priority)
      .where(eq(schema.priority.id, id));

    return json({
      success: true,
      message: 'Priority deleted successfully.'
    });

  } catch (err) {
    console.error('Error deleting priority:', err);

    // Handle foreign key constraint error
    if (err instanceof Error && err.message.includes('foreign key')) {
      return json({
        success: false,
        message: 'Cannot delete priority with associated tickets.'
      }, { status: 400 });
    }

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete priority.',
      error: errorMessage
    }, { status: 500 });
  }
};
