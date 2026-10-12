import * as schema from '#lib/server/db/schema/index.js';
import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireAuth } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const attachments = await schema.validate(schema.attachmentSettingsSchema)(request);

	const [config] = await db
		.insert(schema.config)
		.values({
			key: 'attachments',
			value: attachments
		})
		.onConflictDoUpdate({
			target: [schema.config.organizationId, schema.config.key],
			set: {
				value: attachments,
				updatedAt: new Date()
			}
		})
		.returning();

	const created = config.createdAt.getTime() === config.updatedAt.getTime();

	return Response.json(
		{
			success: true,
			data: config.value,
			created
		},
		{ status: created ? 201 : 200 }
	);
};

export const GET: RequestHandler = async ({ locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const [config] = await db
		.select()
		.from(schema.config)
		.where(eq(schema.config.key, 'attachments'));

	if (!config) {
		return Response.json({
			success: true,
			data: null
		});
	}

	return Response.json({
		success: true,
		data: config.value
	});
};
