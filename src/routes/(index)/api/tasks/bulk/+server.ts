import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { NotFoundError } from '$lib/server/errors';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request }) => {
	const { ids, itemId, itemType } = await schema.validate(schema.bulkAssignmentSchema)(request);

	let updatedCount = 0;

	switch (itemType) {
		case 'user': {
			const result = await db
				.update(schema.task)
				.set({ assigneeId: itemId })
				.where(inArray(schema.task.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}

		case 'status': {
			const result = await db
				.update(schema.task)
				.set({ statusId: itemId })
				.where(inArray(schema.task.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}

		case 'priority': {
			const result = await db
				.update(schema.task)
				.set({ priorityId: itemId })
				.where(inArray(schema.task.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}

		case 'tag': {
			// Verify tag exists
			const [tag] = await db.select().from(schema.tag).where(eq(schema.tag.id, itemId));

			if (!tag) {
				throw new NotFoundError('Tag not found');
			}

			// Add tag to all tasks (using onConflictDoNothing to prevent duplicates)
			await Promise.all(
				ids.map((taskId) =>
					db.insert(schema.taskTag).values({ taskId, tagId: itemId }).onConflictDoNothing()
				)
			);

			return json(
				{
					success: true,
					updatedCount: ids.length,
					message: `Tag added to ${ids.length} task(s)`
				},
				{ status: 200 }
			);
		}
	}

	if (updatedCount === 0) {
		throw new NotFoundError(
			'No tasks were updated. Task(s) may not exist or you may not have permission.'
		);
	}

	return json(
		{
			success: true,
			updated: updatedCount
		},
		{ status: 200 }
	);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { ids } = await schema.validate(schema.idsBulkSchema)(request);

	const deleted = await db.delete(schema.task).where(inArray(schema.task.id, ids)).returning();

	if (deleted.length === 0) {
		throw new NotFoundError('No tasks were found.');
	}

	return json(
		{
			success: true,
			deleted: deleted.length
		},
		{ status: 200 }
	);
};
