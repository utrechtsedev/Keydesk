import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ depends, params, locals }) => {
	const { db } = requireAuth(locals);
	const id = Number(params.id);

	depends('app:tickets');

	const tickets = await db.query.ticket.findMany({
		where: (ticket, { eq }) => eq(ticket.assigneeId, id),
		with: {
			status: true
		},
		orderBy: (ticket, { desc }) => [desc(ticket.createdAt)]
	});
	const users = await db.query.user.findMany();

	return {
		tickets,
		users
	};
};
