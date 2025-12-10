import { decrypt, encrypt } from "$lib/server/db/encrypt";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { type SMTP } from "$lib/types";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { smtp } = await request.json() as { smtp: SMTP };

    if (!smtp.senderName || !smtp.senderEmail || !smtp.host || !smtp.port) {
      return error(400, 'Please enter SMTP sender name, email, host and port.');
    }

    if (smtp.enableAuthentication && (!smtp.username || !smtp.password)) {
      return error(400, 'Please enter an SMTP username and password or disable SMTP authentication.');
    }

    if (smtp.password) {
      smtp.password = encrypt(smtp.password);
    }

    const [config] = await db
      .insert(schema.config)
      .values({
        key: 'smtp',
        value: smtp
      })
      .onConflictDoUpdate({
        target: schema.config.key,
        set: {
          value: smtp,
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
    console.error('Error saving smtp configuration:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save smtp configuration',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const [config] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'smtp'));

    if (!config) {
      return json({
        success: true,
        data: null,
      });
    }

    const response: SMTP = config.value as SMTP;
    response.password = decrypt(response.password);

    return json({
      success: true,
      data: response,
    });

  } catch (err) {
    return json(
      {
        success: false,
        message: 'Failed to fetch SMTP settings',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
