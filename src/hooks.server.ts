import 'dotenv/config';
import { assertAuthSecret, createAuth } from '#lib/server/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building, dev } from '$app/env';
import { logger } from '#lib/server/logger.js';
import { AppError } from '#lib/server/errors.js';
import { initQueue, registerWorkers } from '#lib/server/queue.js';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { connect, databaseUrl, disconnect, withTenant } from '#lib/server/db/database.js';
import { refuseAccess } from '#lib/server/access.js';

export const init: ServerInit = async () => {
	// Only prerendering runs this during a build; there is nothing to queue then
	if (building) return;

	// Checked here so missing settings stop the server at startup, not on the first request
	databaseUrl();
	assertAuthSecret();
	await initQueue();
	await registerWorkers();
};

export const handle: Handle = async ({ event, resolve }) => {
	const systemDb = connect(databaseUrl());
	try {
		const auth = createAuth(systemDb);
		event.locals.systemDb = systemDb;
		event.locals.auth = auth;
		event.locals.db = null;

		const session = await auth.api.getSession({
			headers: event.request.headers
		});
		const user = session
			? await systemDb.query.user.findFirst({
					where: (user, { eq }) => eq(user.id, Number(session.user.id))
				})
			: undefined;
		// Disabling a user also revokes their sessions; checking here keeps them out regardless
		const signedIn = session && user && !user.banned ? { session: session.session, user } : null;
		event.locals.user = signedIn?.user ?? null;
		event.locals.session = signedIn?.session ?? null;

		const refusal = refuseAccess(event);
		if (refusal) return refusal;

		if (!signedIn) return await svelteKitHandler({ event, resolve, auth, building });

		// One tenant transaction per request: its loads and endpoints only see the user's organization
		return await withTenant(systemDb, signedIn.user.organizationId, (db) => {
			event.locals.db = db;
			return svelteKitHandler({ event, resolve, auth, building });
		});
	} finally {
		await disconnect(systemDb);
	}
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
