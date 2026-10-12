import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';

export const load: PageServerLoad = async ({ depends, params, locals }) => {
	const { db } = requireAuth(locals);
	const id = Number(params.id);

	depends('app:tasks');

	const tasks = await db.query.task.findMany({
		where: (task, { eq }) => eq(task.assigneeId, id),
		with: {
			status: true
		},
		orderBy: (task, { desc }) => [desc(task.createdAt)]
	});
	const users = await db.query.user.findMany();

	return {
		tasks,
		users
	};
};
