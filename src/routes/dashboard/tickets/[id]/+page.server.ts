import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, depends }) => {
	depends('app:ticket');

	const id = Number(params.id);

	// Fetch ticket with all relations
	const ticket = await db.query.ticket.findFirst({
		where: eq(schema.ticket.id, id),
		with: {
			requester: true,
			status: true,
			category: true,
			priority: true,
			assignee: true,
			ticketTags: {
				with: {
					tag: true
				}
			},
			messages: {
				with: {
					messageAttachments: true,
					messageUser: true,
					messageRequester: true
				},
				orderBy: desc(schema.ticketMessage.createdAt)
			}
		}
	});

	// Fetch all lookup data
	const priorities = await db.select().from(schema.priority);
	const users = await db.select().from(schema.user);
	const statuses = await db.select().from(schema.status);
	const categories = await db.select().from(schema.category);

	if (
		!ticket ||
		priorities.length < 1 ||
		users.length < 1 ||
		statuses.length < 1 ||
		categories.length < 1
	) {
		return redirect(301, '/dashboard');
	}

	// Transform tags from join table format
	const ticketWithTags = {
		...ticket,
		tags: ticket.ticketTags.map((tt) => tt.tag)
	};

	return {
		ticket: ticketWithTags,
		priorities,
		users,
		statuses,
		categories
	};
};
