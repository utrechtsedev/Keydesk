import { TicketAttachment } from '$lib/server/db/models';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export const GET: RequestHandler = async ({ params, locals }): Promise<Response> => {
  try {
    if (!locals.user) {
      return error(401, { message: 'Authentication required.' });
    }

    const { id: ticketId, fileName } = params;

    if (!ticketId || isNaN(Number(ticketId))) {
      return error(400, { message: 'Valid ticket ID is required.' });
    }

    if (!fileName || fileName.trim() === '') {
      return error(400, { message: 'File name is required.' });
    }

    const attachment = await TicketAttachment.findOne({
      where: {
        ticketId: Number(ticketId),
        fileName: fileName,
      },
    });

    if (!attachment) {
      return error(404, { message: 'Attachment not found.' });
    }

    const filePath = path.resolve(attachment.filePath);

    const uploadsDir = path.resolve('./uploads');
    if (!filePath.startsWith(uploadsDir)) {
      console.error('Path traversal attempt detected:', filePath);
      return error(403, { message: 'Invalid file path.' });
    }

    if (!fs.existsSync(filePath)) {
      console.error('File not found on disk:', filePath);
      return error(404, { message: 'File not found on server.' });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.promises.readFile(filePath);
    } catch (err) {
      console.error('Error reading file:', err);
      return error(500, { message: 'Failed to read file.' });
    }

    try {
      await attachment.increment('downloadCount');
    } catch (err) {
      console.error('Failed to increment download count:', err);
    }

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': attachment.fileSize.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalFileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (err) {
    console.error('Error downloading attachment:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json(
      {
        message: 'Failed to download file.',
        error: errorMessage
      },
      { status: 500 }
    );
  }
};
