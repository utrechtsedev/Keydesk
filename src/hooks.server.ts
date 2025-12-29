import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building, dev } from '$app/environment';
import { logger } from '$lib/server/logger';
import { AppError } from '$lib/server/errors';
import { initQueue, registerWorkers } from '$lib/server/queue';
import type { User } from 'better-auth';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { ticketService } from '$lib/server/services/ticket.service';

await ticketService.ensureTicketSequence();
await initQueue();
await registerWorkers();

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user
		? { ...(session.user as User), id: Number(session.user.id) }
		: null;

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
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
		logger.error(
			{
				errorId,
				status,
				message,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				path: event.url.pathname,
				method: event.request.method,
				userId: event.locals.user?.id
			},
			'Unexpected error'
		);
	}

	return {
		message: dev && error instanceof Error ? error.message : message,
		errorId
	};
};
