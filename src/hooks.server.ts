import { getAuth } from '#lib/server/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building, dev } from '$app/env';
import { logger } from '#lib/server/logger.js';
import { AppError } from '#lib/server/errors.js';
import { initQueue, registerWorkers } from '#lib/server/queue.js';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { assertDatabaseUrl, db } from '#lib/server/db/database.js';
import { refuseAccess } from '#lib/server/access.js';

export const init: ServerInit = async () => {
	// Only prerendering runs this during a build; there is nothing to queue then
	if (building) return;

	assertDatabaseUrl();
	// Created here so a missing BETTER_AUTH_SECRET stops the server at startup, not on the first request
	getAuth();
	await initQueue();
	await registerWorkers();
};

export const handle: Handle = async ({ event, resolve }) => {
	const auth = getAuth();
	const session = await auth.api.getSession({
		headers: event.request.headers
	});
	event.locals.session = session?.session ?? null;
	if (session?.user) {
		const user = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.id, Number(session.user.id))
		});
		event.locals.user = user ?? null;
	} else {
		event.locals.user = null;
	}

	const refusal = await refuseAccess(event);
	if (refusal) return refusal;

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handleError: HandleServerError = ({ kind, error, event }) => {
	const errorId = crypto.randomUUID();

	if (error instanceof AppError) {
		logger.warn(
			{
				errorId,
				status: error.status,
				code: error.code,
				message: error.message,
				path: event.url.pathname,
				method: event.request.method,
				userId: event.locals.user?.id
			},
			'Application error'
		);
	} else {
		// Since SvelteKit 3 this hook also receives framework errors (such as 404s), which carry their own status and message
		const { status, message } =
			kind === 'unknown' ? { status: 500, message: 'Internal Error' } : error;

		logger.error(
			{
				errorId,
				kind,
				status,
				message,
				error:
					error instanceof Error ? error.message : kind === 'unknown' ? String(error) : undefined,
				stack: error instanceof Error ? error.stack : undefined,
				path: event.url.pathname,
				method: event.request.method,
				userId: event.locals.user?.id
			},
			'Unexpected error'
		);
	}

	return dev && error instanceof Error ? { message: error.message, errorId } : { errorId };
};
