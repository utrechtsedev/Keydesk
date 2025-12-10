import { decrypt, encrypt } from "$lib/server/db/encrypt";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { type IMAP } from "$lib/types";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { imap } = await request.json() as { imap: IMAP };

    if (!imap.host || !imap.port || !imap.username || !imap.password) {
      return error(400, 'Please enter IMAP details.');
    }

    if (imap.password) {
      imap.password = encrypt(imap.password);
    }

    const [config] = await db
      .insert(schema.config)
      .values({
        key: 'imap',
        value: imap
      })
      .onConflictDoUpdate({
        target: schema.config.key,
        set: {
          value: imap,
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
    console.error('Error saving imap configuration:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save imap configuration',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const [config] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'imap'));

    if (!config) {
      return json({
        success: true,
        data: null,
      });
    }

    const response: IMAP = config.value as IMAP;
    response.password = decrypt(response.password);

    return json({
      success: true,
      data: response,
    });

  } catch (err) {
    return json(
      {
        success: false,
        message: 'Failed to fetch IMAP settings',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
