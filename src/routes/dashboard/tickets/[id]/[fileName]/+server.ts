import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { type RequestHandler } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { logger } from '$lib/server/logger';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ params }): Promise<Response> => {
  const { id: ticketId, fileName } = params;

  if (!ticketId || isNaN(Number(ticketId)))
    throw new ValidationError('Valid ticket ID is required.');

  if (!fileName || fileName.trim() === '')
    throw new ValidationError('File name is required.');

  const [attachment] = await db
    .select()
    .from(schema.ticketAttachment)
    .where(
      and(
        eq(schema.ticketAttachment.ticketId, Number(ticketId)),
        eq(schema.ticketAttachment.fileName, fileName)
      )
    );

  if (!attachment)
    throw new NotFoundError('Attachment not found.');

  const filePath = path.resolve(attachment.filePath);
  const uploadsDir = path.resolve('./uploads');

  if (!filePath.startsWith(uploadsDir)) {
    logger.warn({
      filePath,
      uploadsDir,
    }, 'Path traversal attempt detected');
    throw new ForbiddenError('Access denied');
  }

  if (!fs.existsSync(filePath))
    throw new NotFoundError('File not found');

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.promises.readFile(filePath);
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to read file');

    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      throw new NotFoundError('File not found');

    throw new AppError('Failed to read file', 500);
  }

  await db
    .update(schema.ticketAttachment)
    .set({
      downloadCount: sql`${schema.ticketAttachment.downloadCount} + 1`
    })
    .where(eq(schema.ticketAttachment.id, attachment.id))
    .catch(err => {
      logger.warn({ error: err, attachmentId: attachment.id }, 'Failed to increment download count');
    });

  return new Response(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': attachment.mimeType,
      'Content-Length': attachment.fileSize.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalFileName)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
};
