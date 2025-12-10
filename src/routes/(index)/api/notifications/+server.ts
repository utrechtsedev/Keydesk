import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema"
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";

export const PATCH: RequestHandler = async ({ request, locals }) => {
  try {

    if (!locals.user) {
      return error(401, 'Unauthorized');
    }

    const { id, isRead } = await request.json() as { id: number; isRead?: boolean };

    if (!id || typeof id !== 'number') {
      return error(400, 'Notification ID is required');
    }

    const [notification] = await db.select().from(schema.userNotification).where(and(eq(schema.userNotification.userId, locals.user.id), eq(schema.userNotification.id, id)))

    if (!notification) {
      return error(404, 'Notification not found or you do not have permission to update it');
    }

    const readStatus = isRead !== undefined ? isRead : true;
    const [updatedNotification] = await db.update(schema.userNotification).set({ isRead: readStatus, readAt: readStatus ? new Date() : null }).where(eq(schema.userNotification.id, id)).returning()

    return json({
      success: true,
      notification: {
        id: updatedNotification.id,
        isRead: updatedNotification.isRead,
        readAt: updatedNotification.readAt
      },
      message: `Notification marked as ${readStatus ? 'read' : 'unread'}`
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to update notification',
      error: errorMessage
    }, { status: 500 });
  }
};


export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const id = url.searchParams.get('id');

  if (!id || isNaN(Number(id))) {
    return json({ success: false, message: 'Valid notification ID is required' }, { status: 400 });
  }

  const deleted = await db.delete(schema.userNotification).where(
    and(
      eq(schema.userNotification.id, Number(id)),
      eq(schema.userNotification.userId, locals.user.id)
    )
  );

  if (deleted.rowCount === 0) {
    return json({
      success: false,
      message: 'Notification not found or unauthorized'
    }, { status: 404 });
  }

  return json({
    success: true,
    message: 'Notification deleted successfully'
  });
};
