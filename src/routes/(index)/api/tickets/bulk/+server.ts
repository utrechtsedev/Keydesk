import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { NotFoundError } from '$lib/server/errors';

export const PATCH: RequestHandler = async ({ request }) => {
	const { ids, itemId, itemType } = await schema.validate(schema.bulkAssignmentSchema)(request);

	let updatedCount = 0;

	switch (itemType) {
		case 'user': {
			const result = await db
				.update(schema.ticket)
				.set({ assigneeId: itemId })
				.where(inArray(schema.ticket.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}

		case 'category': {
			const result = await db
				.update(schema.ticket)
				.set({ categoryId: itemId })
				.where(inArray(schema.ticket.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}

		case 'status': {
			const result = await db
				.update(schema.ticket)
				.set({ statusId: itemId })
				.where(inArray(schema.ticket.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}

		case 'priority': {
			const result = await db
				.update(schema.ticket)
				.set({ priorityId: itemId })
				.where(inArray(schema.ticket.id, ids))
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

			await Promise.all(
				ids.map((ticketId) =>
					db.insert(schema.ticketTag).values({ ticketId, tagId: itemId }).onConflictDoNothing()
				)
			);

			return json(
				{
					success: true,
					updatedCount: ids.length,
					message: `Tag added to ${ids.length} ticket(s)`
				},
				{ status: 200 }
			);
		}
	}

	if (updatedCount === 0) {
		throw new NotFoundError(
			'No tickets were updated. Ticket(s) may not exist or you may not have permission.'
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

	const deleted = await db.delete(schema.ticket).where(inArray(schema.ticket.id, ids)).returning();

	if (deleted.length === 0) {
		throw new NotFoundError('No tickets were found.');
	}

	return json(
		{
			success: true,
			deleted: deleted.length
		},
		{ status: 200 }
	);
};
