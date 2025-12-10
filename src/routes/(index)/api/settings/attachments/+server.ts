import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import type { Attachment } from "$lib/types";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { attachments } = await request.json() as { attachments: Attachment };

    if (!attachments) {
      return error(400, { message: 'Attachments are required.' });
    }

    const [config] = await db
      .insert(schema.config)
      .values({
        key: 'attachments',
        value: attachments
      })
      .onConflictDoUpdate({
        target: schema.config.key,
        set: {
          value: attachments,
          updatedAt: new Date()
        }
      })
      .returning();

    const created = config.createdAt.getTime() === config.updatedAt.getTime();

    return json({
      success: true,
      data: config.value,
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving attachment configuration:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save attachment configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    const [config] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'attachments'));

    if (!config) {
      return json({
        success: true,
        data: null,
      });
    }

    return json({
      success: true,
      data: config.value,
    });

  } catch (err) {
    return json(
      {
        success: false,
        message: 'Failed to fetch attachments',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
