import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { NotFoundError } from '#lib/server/errors.js';
import { requireAuth } from '#lib/server/auth.js';

export const PATCH: RequestHandler = async ({ request, params, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);
	const user = await schema.validate(schema.updateUserSchema)(request);

	const [updatedUser] = await db
		.update(schema.user)
		.set({
			name: user.name,
			email: user.email,
			role: user.role,
			banned: user.banned,
			notificationPreferences: user.notificationPreferences,
			updatedAt: new Date()
		})
		.where(eq(schema.user.id, id))
		.returning();

	if (!updatedUser) {
		throw new NotFoundError('User not found.');
	}

	return Response.json({
		success: true,
		message: 'User updated successfully.',
		data: updatedUser
	});
};
