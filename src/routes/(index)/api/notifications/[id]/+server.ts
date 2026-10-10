import { requireAuth } from '#lib/server/auth.js';
import { db } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { NotFoundError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const { user } = requireAuth(locals);

	const id = schema.idParamSchema.parse(params.id);

	const notification = await schema.validate(schema.updateUserNotificationSchema)(request);

	const [findNotification] = await db
		.select()
		.from(schema.userNotification)
		.where(and(eq(schema.userNotification.userId, user.id), eq(schema.userNotification.id, id)));

	if (!findNotification)
		throw new NotFoundError('Notification not found or you do not have permission to update it');

	const readStatus = notification.isRead !== undefined ? notification.isRead : true;
	const [updatedNotification] = await db
		.update(schema.userNotification)
		.set({ isRead: readStatus, readAt: readStatus ? new Date() : null })
		.where(eq(schema.userNotification.id, id))
		.returning();

	return Response.json(
		{
			success: true,
			notification: {
				id: updatedNotification.id,
				isRead: updatedNotification.isRead,
				readAt: updatedNotification.readAt
			},
			message: `Notification marked as ${readStatus ? 'read' : 'unread'}`
		},
		{ status: 200 }
	);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = requireAuth(locals);

	const id = schema.idParamSchema.parse(params.id);

	const deleted = await db
		.delete(schema.userNotification)
		.where(
			and(eq(schema.userNotification.id, Number(id)), eq(schema.userNotification.userId, user.id))
		);

	if (deleted.rowCount === 0) throw new NotFoundError('Notification not found or unauthorized');

	return Response.json({
		success: true,
		message: 'Notification deleted successfully'
	});
};
