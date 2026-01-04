import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import z from 'zod';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { user } = requireAuth(locals);

	const updateBulkNotificationSchema = z.object({
		ids: schema.idsBulkSchema,
		notification: schema.updateUserNotificationSchema
	});

	const { ids, notification } = await schema.validate(updateBulkNotificationSchema)(request);

	const updated = await db
		.update(schema.userNotification)
		.set({
			isRead: notification.isRead,
			readAt: new Date()
		})
		.where(
			and(inArray(schema.userNotification.id, ids), eq(schema.userNotification.userId, user.id))
		)
		.returning();

	const updatedCount = updated.length;

	if (updatedCount === 0)
		throw new NotFoundError(
			'No notifications were updated. They may not exist or you may not have permission.'
		);

	return json(
		{
			success: true,
			updatedCount,
			message: `Marked ${updatedCount} notification(s) as read`
		},
		{ status: 200 }
	);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { user } = requireAuth(locals);

	const ids = await schema.validate(schema.idsBulkSchema)(request);

	if (!ids || !Array.isArray(ids) || ids.length < 1)
		throw new ValidationError('Notification IDs are required');

	const deleted = await db
		.delete(schema.userNotification)
		.where(
			and(inArray(schema.userNotification.id, ids), eq(schema.userNotification.userId, user.id))
		)
		.returning();

	const deletedCount = deleted.length;

	if (deletedCount === 0)
		throw new NotFoundError(
			'No notifications were deleted. They may not exist or you may not have permission.'
		);

	return json(
		{
			success: true,
			deletedCount,
			message: `Deleted ${deletedCount} notification(s)`
		},
		{ status: 200 }
	);
};
