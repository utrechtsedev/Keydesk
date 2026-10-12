import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { isUniqueViolation, revokeSessions } from '#lib/server/services/user.service.js';

export const PATCH: RequestHandler = async ({ request, params, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);
	const parsed = schema.adminUpdateUserSchema.safeParse(await request.json());
	if (!parsed.success) {
		return Response.json({ message: parsed.error.issues[0].message }, { status: 400 });
	}
	const changes = parsed.data;

	// Keeps the organization from ending up without an admin, or the admin from locking themselves out
	if (id === user.id && ((changes.role && changes.role !== user.role) || changes.banned)) {
		return Response.json(
			{ message: "You can't change your own role or disable yourself." },
			{ status: 403 }
		);
	}

	let updated: schema.User | undefined;
	try {
		// A savepoint, so a refused email address leaves the request's transaction usable
		updated = await db.transaction(async (savepoint) => {
			const [updated] = await savepoint
				.update(schema.user)
				.set({ ...changes, updatedAt: new Date() })
				.where(eq(schema.user.id, id))
				.returning();
			return updated;
		});
	} catch (error) {
		if (isUniqueViolation(error, 'user_email_unique')) {
			return Response.json(
				{ message: 'Another user already has this email address.' },
				{ status: 409 }
			);
		}
		throw error;
	}

	if (!updated) {
		return Response.json({ message: 'User not found.' }, { status: 404 });
	}

	if (changes.banned) {
		// Sessions are better-auth's, outside the organization's tables
		// eslint-disable-next-line no-restricted-syntax
		await revokeSessions(db, locals.systemDb, id);
	}

	return Response.json({
		success: true,
		message: 'User updated successfully.',
		data: updated
	});
};

export const DELETE: RequestHandler = async ({ params, locals }): Promise<Response> => {
	const { user, db } = requireAuth(locals);
	const id = schema.idParamSchema.parse(params.id);

	if (id === user.id) {
		return Response.json({ message: "You can't delete yourself." }, { status: 403 });
	}

	// Their sessions, account and invitation go with them; their tickets and tasks stay, unassigned
	const [deleted] = await db
		.delete(schema.user)
		.where(eq(schema.user.id, id))
		.returning({ id: schema.user.id });
	if (!deleted) {
		return Response.json({ message: 'User not found.' }, { status: 404 });
	}

	return Response.json({ success: true, message: 'User deleted successfully.' });
};
