import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await db
      .insert(schema.image)
      .values({
        id: 1,
        fileName: file.name,
        mimeType: file.type,
        fileData: buffer,
      })
      .onConflictDoUpdate({
        target: schema.image.id,
        set: {
          fileName: file.name,
          mimeType: file.type,
          fileData: buffer,
          updatedAt: new Date()
        }
      });

    return json({
      success: true,
      message: 'Image uploaded successfully',
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    return json({ error: 'Failed to upload image' }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const [image] = await db
      .select()
      .from(schema.image)
      .where(eq(schema.image.id, 1));

    if (!image) {
      throw error(404, 'Image not found');
    }

    return new Response(new Uint8Array(image.fileData), {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Disposition': `inline; filename="${image.fileName}"`,
      },
    });
  } catch (err) {
    throw error(500, 'Failed to retrieve image');
  }
};
