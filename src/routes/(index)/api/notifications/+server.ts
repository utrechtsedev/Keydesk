import { requireAuth } from "$lib/server/auth-helpers";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema"
import { NotFoundError, ValidationError } from "$lib/server/errors";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";

export const PATCH: RequestHandler = async ({ request, locals }) => {
  const { user } = requireAuth(locals)

  const { id, isRead } = await request.json() as { id: number; isRead?: boolean };

  if (!id || typeof id !== 'number')
    throw new ValidationError('Notification ID is required')


  const [notification] = await db.select().from(schema.userNotification).where(and(eq(schema.userNotification.userId, user.id), eq(schema.userNotification.id, id)))

  if (!notification)
    throw new NotFoundError('Notification not found or you do not have permission to update it')

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
};


export const DELETE: RequestHandler = async ({ url, locals }) => {
  const { user } = requireAuth(locals)

  const id = url.searchParams.get('id');

  if (!id || isNaN(Number(id)))
    throw new ValidationError('Valid notification ID is required')

  const deleted = await db.delete(schema.userNotification).where(
    and(
      eq(schema.userNotification.id, Number(id)),
      eq(schema.userNotification.userId, user.id)
    )
  );

  if (deleted.rowCount === 0)
    throw new NotFoundError('Notification not found or unauthorized')

  return json({
    success: true,
    message: 'Notification deleted successfully'
  });
};
