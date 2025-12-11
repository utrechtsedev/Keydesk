import type { User as UserType } from "$lib/types";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAuth } from "$lib/server/auth-helpers";
import { NotFoundError, ValidationError } from "$lib/server/errors";

export const PATCH: RequestHandler = async ({ request, locals }): Promise<Response> => {
  const { user } = requireAuth(locals)

  const { user: userData } = await request.json() as { user: UserType };

  if (!user) throw new ValidationError('JSON formatted incorrectly')

  const findUser = await db.select().from(schema.user).where(eq(schema.user.id, user.id))

  if (!findUser) throw new NotFoundError('User not found.')

  const [updated] = await db.update(schema.user).set({
    name: user.name,
    email: user.email,
    notificationPreferences: userData.notificationPreferences
  }).where(eq(schema.user.id, user.id)).returning()

  return json({ success: true, user: updated })
}
