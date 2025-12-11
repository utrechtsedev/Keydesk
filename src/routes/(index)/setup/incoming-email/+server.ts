import { decrypt, encrypt } from "$lib/server/db/encrypt";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import { type IMAP } from "$lib/types";
import { ValidationError } from "$lib/server/errors";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { imap } = await request.json() as { imap: IMAP };

  if (!imap.host || !imap.port || !imap.username || !imap.password)
    throw new ValidationError('Please enter IMAP details.')

  if (imap.password) imap.password = encrypt(imap.password);

  // Try to insert, if exists then update
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

  // Check if it was created or updated by checking if updatedAt equals createdAt
  const created = config.createdAt.getTime() === config.updatedAt.getTime();

  return json({
    success: true,
    data: config.value,
    created
  }, { status: created ? 201 : 200 });

};

export const GET: RequestHandler = async () => {
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
};
