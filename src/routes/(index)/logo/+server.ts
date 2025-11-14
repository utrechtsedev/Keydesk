import { models } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await models.Image.upsert({
      id: 1,
      fileName: file.name,
      mimeType: file.type,
      fileData: buffer,
    });

    return json({
      success: true,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return json({ error: 'Failed to upload image' }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const image = await models.Image.findByPk(1);

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
