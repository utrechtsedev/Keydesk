import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '$lib/server/errors';
import type { Tag } from '$lib/types';

/**
 * POST /api/tickets/{id}/tags
 * Add a single tag to a ticket (without removing existing tags)
 * Body: { tag: "bug" }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { id: ticketId } = schema.idParamSchema.parse({ id: params.id });

	const [ticket] = await db.select().from(schema.ticket).where(eq(schema.ticket.id, ticketId));
	if (!ticket) {
		throw new NotFoundError('Ticket not found');
	}

	const { tag: tagName } = await schema.validate(schema.setTagSchema)(request);

	const normalizedName = tagName.toLowerCase();

	let tagInstance: Tag;
	const [existingTag] = await db
		.select()
		.from(schema.tag)
		.where(eq(schema.tag.name, normalizedName));

	if (existingTag) {
		tagInstance = existingTag;
	} else {
		const [newTag] = await db.insert(schema.tag).values({ name: normalizedName }).returning();
		tagInstance = newTag;
	}

	await db
		.insert(schema.ticketTag)
		.values({
			ticketId,
			tagId: tagInstance.id
		})
		.onConflictDoNothing();

	return json({
		success: true,
		tag: tagInstance
	});
};

/**
 * PUT /api/tickets/{id}/tags
 * Set/replace all tags for a ticket
 * Body: { tags: ["bug", "urgent", "frontend"] }
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	const { id: ticketId } = schema.idParamSchema.parse({ id: params.id });

	const [ticket] = await db.select().from(schema.ticket).where(eq(schema.ticket.id, ticketId));

	if (!ticket) {
		throw new NotFoundError('Ticket not found');
	}

	const { tags } = await schema.validate(schema.setTagsSchema)(request);

	await db.delete(schema.ticketTag).where(eq(schema.ticketTag.ticketId, ticketId));

	if (tags.length === 0) {
		return json({ success: true, tags: [] });
	}

	const tagInstances = await Promise.all(
		tags.map(async (tagName: string) => {
			const normalizedName = tagName.toLowerCase();

			const [existingTag] = await db
				.select()
				.from(schema.tag)
				.where(eq(schema.tag.name, normalizedName));

			if (existingTag) {
				return existingTag;
			}

			const [newTag] = await db.insert(schema.tag).values({ name: normalizedName }).returning();

			return newTag;
		})
	);

	await db.insert(schema.ticketTag).values(
		tagInstances.map((tag: Tag) => ({
			ticketId,
			tagId: tag.id
		}))
	);

	return json({
		success: true,
		tags: tagInstances
	});
};

/**
 * GET /api/tickets/{id}/tags
 * Get all tags for a ticket
 */
export const GET: RequestHandler = async ({ params }) => {
	const { id: ticketId } = schema.idParamSchema.parse({ id: params.id });

	const [ticket] = await db.select().from(schema.ticket).where(eq(schema.ticket.id, ticketId));

	if (!ticket) {
		throw new NotFoundError('Ticket not found');
	}

	const ticketTags = await db.query.ticketTag.findMany({
		where: eq(schema.ticketTag.ticketId, ticketId),
		with: {
			tag: true
		}
	});

	const tags = ticketTags.map((tt) => tt.tag);

	return json({
		success: true,
		tags
	});
};

/**
 * DELETE /api/tickets/{id}/tags
 * Remove all tags from a ticket
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const { id: ticketId } = schema.idParamSchema.parse({ id: params.id });

	const [ticket] = await db.select().from(schema.ticket).where(eq(schema.ticket.id, ticketId));

	if (!ticket) {
		throw new NotFoundError('Ticket not found');
	}

	await db.delete(schema.ticketTag).where(eq(schema.ticketTag.ticketId, ticketId));

	return json({
		success: true,
		message: 'All tags removed from ticket'
	});
};
