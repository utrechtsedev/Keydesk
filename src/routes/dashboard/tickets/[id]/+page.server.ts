import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, depends }) => {
	depends('app:ticket');

	const id = Number(params.id);

	const ticket = await db.query.ticket.findFirst({
		where: (ticket, { eq }) => eq(ticket.id, id),
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
			tasks: {
				with: {
					assignee: true,
					status: true,
					priority: true,
					creator: true,
					ticket: true,
					taskTags: {
						with: {
							tag: true
						}
					}
				}
			},
			messages: {
				with: {
					messageAttachments: true,
					messageUser: true,
					messageRequester: true
				},
				orderBy: (messages, { desc }) => desc(messages.createdAt)
			}
		}
	});

	const parentTasks = await db.query.task.findMany({
		where: (task, { and, isNull, eq }) => and(eq(task.ticketId, id), isNull(task.parentTaskId)),
		with: {
			assignee: true,
			status: true,
			priority: true,
			creator: true,
			ticket: true,
			taskTags: {
				with: {
					tag: true
				}
			}
		}
	});

	const priorities = await db.query.priority.findMany();
	const users = await db.query.user.findMany();
	const statuses = await db.query.status.findMany();
	const categories = await db.query.category.findMany();

	if (
		!ticket ||
		priorities.length < 1 ||
		users.length < 1 ||
		statuses.length < 1 ||
		categories.length < 1
	) {
		return redirect(301, '/dashboard');
	}

	const tasksWithTags = ticket.tasks.map((task) => ({
		...task,
		tags: task.taskTags.map((tt) => tt.tag)
	}));

	const parentTasksWithTags = parentTasks.map((task) => ({
		...task,
		tags: task.taskTags.map((tt) => tt.tag)
	}));

	const ticketWithTags = {
		...ticket,
		tags: ticket.ticketTags.map((tt) => tt.tag),
		tasks: tasksWithTags
	};

	return {
		ticket: ticketWithTags,
		priorities,
		users,
		statuses,
		categories,
		parentTasks: parentTasksWithTags
	};
};
