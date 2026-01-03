import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
	const bulkTagTaskSchema = schema.idsBulkSchema.extend(schema.setTagsSchema.shape);
	const { ids, tags } = await schema.validate(bulkTagTaskSchema)(request);

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

	return json({
		success: true
	});
};
