import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request }) => {
	const { ids, itemId, itemType } = (await request.json()) as {
		ids: number[];
		itemId: number;
		itemType: 'user' | 'category' | 'status' | 'priority' | 'tag';
	};

	if (!ids || !Array.isArray(ids) || ids.length < 1 || !itemId || !itemType)
		throw new ValidationError('Some fields are missing. Please retry your request.');

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
			const categoryId = itemId;
			if (isNaN(categoryId)) throw new ValidationError('Invalid category ID');

			const result = await db
				.update(schema.ticket)
				.set({ categoryId })
				.where(inArray(schema.ticket.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}
		case 'status': {
			const statusId = itemId;
			if (isNaN(statusId)) throw new ValidationError('Invalid status ID');

			const result = await db
				.update(schema.ticket)
				.set({ statusId })
				.where(inArray(schema.ticket.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}
		case 'priority': {
			const priorityId = itemId;
			if (isNaN(priorityId)) throw new ValidationError('Invalid priority ID');

			const result = await db
				.update(schema.ticket)
				.set({ priorityId })
				.where(inArray(schema.ticket.id, ids))
				.returning();
			updatedCount = result.length;
			break;
		}
		case 'tag': {
			const tagId = itemId;
			if (isNaN(tagId)) throw new ValidationError('Invalid tag ID');

			// Verify tag exists
			const [tag] = await db.select().from(schema.tag).where(eq(schema.tag.id, tagId));

			if (!tag) throw new NotFoundError('Tag not found');

			// Add tag to all tickets (using onConflictDoNothing to prevent duplicates)
			await Promise.all(
				ids.map((ticketId) =>
					db.insert(schema.ticketTag).values({ ticketId, tagId }).onConflictDoNothing()
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
		default:
			throw new ValidationError('Invalid item type');
	}

	if (updatedCount === 0)
		throw new NotFoundError(
			'No tickets were updated. Ticket(s) may not exist or you may not have permission.'
		);

	return json(
		{
			success: true,
			updated: updatedCount
		},
		{ status: 200 }
	);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { ids } = (await request.json()) as { ids: number[] };

	if (!ids || !Array.isArray(ids) || ids.length < 1)
		throw new ValidationError('Some fields are missing. Please retry your request.');

	const deleted = await db.delete(schema.ticket).where(inArray(schema.ticket.id, ids)).returning();

	if (!deleted || deleted.length === 0) throw new NotFoundError('No tickets were found.');

	return json(
		{
			success: true,
			deleted: deleted.length
		},
		{ status: 200 }
	);
};
