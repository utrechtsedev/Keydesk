import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq, and, inArray } from "drizzle-orm";

export const PATCH: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return error(401, 'Unauthorized');
    }

    const { ids } = await request.json() as { ids: number[] };

    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return error(400, 'Notification IDs are required');
    }

    const updated = await db
      .update(schema.userNotification)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(
        and(
          inArray(schema.userNotification.id, ids),
          eq(schema.userNotification.userId, locals.user.id)
        )
      )
      .returning();

    const updatedCount = updated.length;

    if (updatedCount === 0) {
      return json({
        success: false,
        message: 'No notifications were updated. They may not exist or you may not have permission.',
        updatedCount: 0
      }, { status: 404 });
    }

    return json({
      success: true,
      updatedCount,
      message: `Marked ${updatedCount} notification(s) as read`
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: errorMessage
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return error(401, 'Unauthorized');
    }

    const { ids } = await request.json() as { ids: number[] };

    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return error(400, 'Notification IDs are required');
    }

    const deleted = await db
      .delete(schema.userNotification)
      .where(
        and(
          inArray(schema.userNotification.id, ids),
          eq(schema.userNotification.userId, locals.user.id)
        )
      )
      .returning();

    const deletedCount = deleted.length;

    if (deletedCount === 0) {
      return json({
        success: false,
        message: 'No notifications were deleted. They may not exist or you may not have permission.',
        deletedCount: 0
      }, { status: 404 });
    }

    return json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} notification(s)`
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete notifications',
      error: errorMessage
    }, { status: 500 });
  }
};
