import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewStatus } from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { statuses } = await request.json() as { statuses: NewStatus[] };

    if (!statuses) {
      return error(400, { message: 'Statuses are required.' });
    }

    if (statuses.length < 2) {
      return error(400, { message: 'You must at least have 2 statuses. 1 for open tickets, 1 for closed tickets' });
    }

    const defaultStatuses = statuses.filter((s) => s.isDefault);
    if (defaultStatuses.length !== 1) {
      return error(400, { message: 'You must only have 1 default status.' });
    }

    const openStatuses = statuses.filter((s) => !s.isClosed);
    if (openStatuses.length < 1) {
      return error(400, { message: 'You must have at least 1 open status.' });
    }

    const closedStatuses = statuses.filter((s) => s.isClosed);
    if (closedStatuses.length < 1) {
      return error(400, { message: 'You must have at least 1 closed status.' });
    }

    // Bulk upsert
    const created = await db
      .insert(schema.status)
      .values(statuses)
      .onConflictDoUpdate({
        target: schema.status.id,
        set: {
          name: sql`EXCLUDED.name`,
          color: sql`EXCLUDED.color`,
          isDefault: sql`EXCLUDED.is_default`,
          isClosed: sql`EXCLUDED.is_closed`,
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
    console.error('Error saving statuses:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save statuses settings',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    const statuses = await db
      .select()
      .from(schema.status);

    return json({
      success: true,
      data: statuses
    });

  } catch (err) {
    return json(
      {
        success: false,
        message: 'Failed to fetch statuses',
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
        message: 'Status ID is required.'
      }, { status: 400 });
    }

    // Check if status exists
    const [status] = await db
      .select()
      .from(schema.status)
      .where(eq(schema.status.id, id));

    if (!status) {
      return json({
        success: false,
        message: 'Status not found.'
      }, { status: 404 });
    }

    // Check if it's the default status
    if (status.isDefault) {
      return json({
        success: false,
        message: 'Cannot delete the default status. Set another status as default first.'
      }, { status: 400 });
    }

    // Check if status has associated tickets
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.ticket)
      .where(eq(schema.ticket.statusId, id));

    if (Number(ticketCount.count) > 0) {
      return json({
        success: false,
        message: 'Cannot delete status with associated tickets. Please reassign or delete all tickets first.'
      }, { status: 400 });
    }

    // Count open and closed statuses
    const [openStatusCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.status)
      .where(eq(schema.status.isClosed, false));

    const [closedStatusCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.status)
      .where(eq(schema.status.isClosed, true));

    if (!status.isClosed && Number(openStatusCount.count) <= 1) {
      return json({
        success: false,
        message: 'Cannot delete the last open status. At least 1 open status is required.'
      }, { status: 400 });
    }

    if (status.isClosed && Number(closedStatusCount.count) <= 1) {
      return json({
        success: false,
        message: 'Cannot delete the last closed status. At least 1 closed status is required.'
      }, { status: 400 });
    }

    // Delete the status
    await db
      .delete(schema.status)
      .where(eq(schema.status.id, id));

    return json({
      success: true,
      message: 'Status deleted successfully.'
    });

  } catch (err) {
    console.error('Error deleting status:', err);

    // Handle foreign key constraint error
    if (err instanceof Error && err.message.includes('foreign key')) {
      return json({
        success: false,
        message: 'Cannot delete status with associated tickets.'
      }, { status: 400 });
    }

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete status.',
      error: errorMessage
    }, { status: 500 });
  }
};
