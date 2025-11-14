import { UserNotification } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const PATCH: RequestHandler = async ({ request, locals }) => {
  try {

    if (!locals.user) {
      return error(401, 'Unauthorized');
    }

    const { id, isRead } = await request.json() as { id: number; isRead?: boolean };

    if (!id || typeof id !== 'number') {
      return error(400, 'Notification ID is required');
    }

    const notification = await UserNotification.findOne({
      where: {
        id,
        userId: locals.user.id
      }
    });

    if (!notification) {
      return error(404, 'Notification not found or you do not have permission to update it');
    }

    const readStatus = isRead !== undefined ? isRead : true;
    await notification.update({
      isRead: readStatus,
      readAt: readStatus ? new Date() : null
    });

    return json({
      success: true,
      notification: {
        id: notification.id,
        isRead: notification.isRead,
        readAt: notification.readAt
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

export const DELETE: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return error(401, 'Unauthorized');
    }

    const { id } = await request.json() as { id: number };

    if (!id || typeof id !== 'number') {
      return error(400, 'Notification ID is required');
    }

    const deletedCount = await UserNotification.destroy({
      where: {
        id,
        userId: locals.user.id
      }
    });

    if (deletedCount === 0) {
      return error(404, 'Notification not found or you do not have permission to delete it');
    }

    return json({
      success: true,
      message: 'Notification deleted successfully'
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete notification',
      error: errorMessage
    }, { status: 500 });
  }
};
