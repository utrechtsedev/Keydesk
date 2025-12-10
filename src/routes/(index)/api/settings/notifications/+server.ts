import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NotificationSettings } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { notifications } = await request.json() as { notifications: NotificationSettings };

    if (!notifications) {
      return error(400, { message: 'Notification settings are required.' });
    }

    const [config] = await db
      .insert(schema.config)
      .values({
        key: 'notifications',
        value: notifications
      })
      .onConflictDoUpdate({
        target: schema.config.key,
        set: {
          value: notifications,
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
    console.error('Error saving notification settings:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save notification configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    const [config] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'notifications'));

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
        message: 'Failed to fetch notification settings',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
