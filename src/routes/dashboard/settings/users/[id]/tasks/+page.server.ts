import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/database';

export const load: PageServerLoad = async ({ depends, params }) => {
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
