import { decrypt, encrypt } from '$lib/server/db/encrypt';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { type SMTP } from '$lib/types';
import { ValidationError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { smtp } = await request.json() as { smtp: SMTP };

  if (!smtp.senderName || !smtp.senderEmail || !smtp.host || !smtp.port)
    throw new ValidationError('Please enter SMTP sender name, email, host and port.');

  if (smtp.enableAuthentication && (!smtp.username || !smtp.password))
    throw new ValidationError('Please enter an SMTP username and password or disable SMTP authentication.');

  if (smtp.password) smtp.password = encrypt(smtp.password);

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
};

export const GET: RequestHandler = async () => {
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
  if (response.password) {
    response.password = decrypt(response.password);
  }

  return json({
    success: true,
    data: response,
  });
};
