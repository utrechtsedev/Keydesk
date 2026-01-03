import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '$lib/server/errors';
import type { Tag } from '$lib/types';

/**
 * POST /api/tasks/{id}/tags
 * Add a single tag to a task (without removing existing tags)
 * Body: { tag: "bug" }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { id: taskId } = schema.idParamSchema.parse({ id: params.id });

	const [task] = await db.select().from(schema.task).where(eq(schema.task.id, taskId));
	if (!task) {
		throw new NotFoundError('Task not found');
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
		.insert(schema.taskTag)
		.values({
			taskId,
			tagId: tagInstance.id
		})
		.onConflictDoNothing();

	return json({
		success: true,
		tag: tagInstance
	});
};

/**
 * PUT /api/tasks/{id}/tags
 * Set/replace all tags for a task
 * Body: { tags: ["bug", "urgent", "frontend"] }
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	const { id: taskId } = schema.idParamSchema.parse({ id: params.id });

	const [task] = await db.select().from(schema.task).where(eq(schema.task.id, taskId));

	if (!task) {
		throw new NotFoundError('Task not found');
	}

	const { tags } = await schema.validate(schema.setTagsSchema)(request);

	await db.delete(schema.taskTag).where(eq(schema.taskTag.taskId, taskId));

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

	await db.insert(schema.taskTag).values(
		tagInstances.map((tag: Tag) => ({
			taskId,
			tagId: tag.id
		}))
	);

	return json({
		success: true,
		tags: tagInstances
	});
};

/**
 * GET /api/tasks/{id}/tags
 * Get all tags for a task
 */
export const GET: RequestHandler = async ({ params }) => {
	const { id: taskId } = schema.idParamSchema.parse({ id: params.id });

	const [task] = await db.select().from(schema.task).where(eq(schema.task.id, taskId));

	if (!task) {
		throw new NotFoundError('Task not found');
	}

	const taskTags = await db.query.taskTag.findMany({
		where: eq(schema.taskTag.taskId, taskId),
		with: {
			tag: true
		}
	});

	const tags = taskTags.map((tt) => tt.tag);

	return json({
		success: true,
		tags
	});
};

/**
 * DELETE /api/tasks/{id}/tags
 * Remove all tags from a task
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const { id: taskId } = schema.idParamSchema.parse({ id: params.id });

	const [task] = await db.select().from(schema.task).where(eq(schema.task.id, taskId));

	if (!task) {
		throw new NotFoundError('Task not found');
	}

	await db.delete(schema.taskTag).where(eq(schema.taskTag.taskId, taskId));

	return json({
		success: true,
		message: 'All tags removed from task'
	});
};
