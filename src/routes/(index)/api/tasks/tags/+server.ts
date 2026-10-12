import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const { ids, tags } = await schema.validate(schema.bulkTagsSchema)(request);

	const tagIds: number[] = [];

	for (const tagName of tags) {
		const existingTag = await db.query.tag.findFirst({
			where: (tag, { eq }) => eq(tag.name, tagName)
		});

		if (existingTag) {
			tagIds.push(existingTag.id);
		} else {
			const [newTag] = await db
				.insert(schema.tag)
				.values({ name: tagName })
				.returning({ id: schema.tag.id });
			tagIds.push(newTag.id);
		}
	}

	const tagAssociations = ids.flatMap((taskId) =>
		tagIds.map((tagId) => ({
			taskId,
			tagId
		}))
	);

	await db.insert(schema.taskTag).values(tagAssociations).onConflictDoNothing();

	return Response.json({
		success: true
	});
};
