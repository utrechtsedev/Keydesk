import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';

export const load: PageServerLoad = async ({ depends, params }) => {
	const id = Number(params.id);

	depends('app:tickets');

	const tickets = await db.query.ticket.findMany({
		where: (ticket, { eq }) => eq(ticket.assignedUserId, id),
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
