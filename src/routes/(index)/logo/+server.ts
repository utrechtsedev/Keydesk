import * as schema from '#lib/server/db/schema/index.js';
import { NotFoundError, ValidationError } from '#lib/server/errors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { db } = requireAuth(locals);
  const formData = await request.formData();
  const file = formData.get('image') as File;

  if (!file)
    throw new ValidationError('No file provided');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await db
    .insert(schema.image)
    .values({
      fileName: file.name,
      mimeType: file.type,
      fileData: buffer,
    })
    .onConflictDoUpdate({
      target: schema.image.organizationId,
      set: {
        fileName: file.name,
        mimeType: file.type,
        fileData: buffer,
        updatedAt: new Date()
      }
    });

  return Response.json({
    success: true,
    message: 'Image uploaded successfully',
  });
};

export const GET: RequestHandler = async ({ locals }) => {
  const { db } = requireAuth(locals);
  // The tenant transaction only sees this organization's logo
  const [image] = await db.select().from(schema.image);

  if (!image)
    throw new NotFoundError('Image not found');


  return new Response(new Uint8Array(image.fileData), {
    headers: {
      'Content-Type': image.mimeType,
      'Content-Disposition': `inline; filename="${image.fileName}"`,
    },
  });
};
