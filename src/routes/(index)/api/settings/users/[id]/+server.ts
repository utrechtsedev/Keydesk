import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import type { User } from '$lib/types';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { json } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({ request, params }): Promise<Response> => {
	const id = Number(params.id);
	const { user } = (await request.json()) as { user: User };

	if (id !== user.id) throw new ValidationError('Incorrect user ID.');

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

	return json({
		success: true,
		message: 'User updated successfully.',
		data: updatedUser
	});
};
