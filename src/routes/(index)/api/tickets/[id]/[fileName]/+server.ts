import * as schema from '#lib/server/db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { type RequestHandler } from '@sveltejs/kit';
import { logger } from '#lib/server/logger.js';
import { requireAuth } from '#lib/server/auth.js';
import { readAttachment } from '#lib/server/attachments.js';

export const GET: RequestHandler = async ({ params, locals }): Promise<Response> => {
	const { db } = requireAuth(locals);
	const { id: ticketId, fileName } = params;

	if (!ticketId || isNaN(Number(ticketId)) || !fileName || fileName.trim() === '') {
		return Response.json({ message: 'Attachment not found.' }, { status: 404 });
	}

	// The tenant transaction only finds attachments of the user's organization, and the storage
	// key comes from that row, never from the request
	const [attachment] = await db
		.select()
		.from(schema.ticketAttachment)
		.where(
			and(
				eq(schema.ticketAttachment.ticketId, Number(ticketId)),
				eq(schema.ticketAttachment.fileName, fileName)
			)
		);

	if (!attachment) {
		return Response.json({ message: 'Attachment not found.' }, { status: 404 });
	}

	const file = await readAttachment(attachment.storageKey);
	if (!file) {
		logger.error({ attachmentId: attachment.id }, 'Attachment missing from storage');
		return Response.json({ message: 'Attachment not found.' }, { status: 404 });
	}

	await db
		.update(schema.ticketAttachment)
		.set({
			downloadCount: sql`${schema.ticketAttachment.downloadCount} + 1`
		})
		.where(eq(schema.ticketAttachment.id, attachment.id));

	return new Response(file.body, {
		status: 200,
		headers: {
			'Content-Type': attachment.mimeType,
			'Content-Length': String(file.size),
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName)}`,
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
