import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { Portal } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { portal } = await request.json() as { portal: Portal };

    if (!portal) {
      return error(400, { message: 'Portal settings are required.' });
    }

    const [config] = await db
      .insert(schema.config)
      .values({
        key: 'portal',
        value: portal
      })
      .onConflictDoUpdate({
        target: schema.config.key,
        set: {
          value: portal,
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
    console.error('Error saving portal settings:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save portal configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    const [config] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'portal'));

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
        message: 'Failed to fetch portal settings',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
