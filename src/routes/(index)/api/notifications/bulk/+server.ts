import { UserNotification } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit";
// path is /notifications but the model we edit is UserNotification. in the future i might move this.
export const PATCH: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return error(401, 'Unauthorized');
    }

    const { ids } = await request.json() as { ids: number[] };

    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return error(400, 'Notification IDs are required');
    }

    const [updatedCount] = await UserNotification.update(
      { 
        isRead: true,
        readAt: new Date()
      },
      { 
        where: { 
          id: ids,
          userId: locals.user.id
        }
      }
    );

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

    const deletedCount = await UserNotification.destroy({
      where: {
        id: ids,
        userId: locals.user.id
      }
    });

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
