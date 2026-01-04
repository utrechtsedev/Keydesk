import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { NotFoundError, UnauthorizedError } from '$lib/server/errors';

export const PATCH: RequestHandler = async ({ request, locals, params }): Promise<Response> => {
	const { user } = requireAuth(locals);

	const id = schema.idParamSchema.parse(params.id);
	const userData = await schema.validate(schema.updateUserSchema)(request);
	console.log(userData);

	if (id !== user.id) throw new UnauthorizedError('You are not authorized to edit other users');

	const findUser = await db.select().from(schema.user).where(eq(schema.user.id, id));

	if (!findUser) throw new NotFoundError('User not found');

	const [updated] = await db
		.update(schema.user)
		.set({
			name: userData.name,
			email: userData.email,
			notificationPreferences: userData.notificationPreferences
		})
		.where(eq(schema.user.id, id))
		.returning();

	return json({ success: true, user: updated });
};
