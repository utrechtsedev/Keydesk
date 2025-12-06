import { User } from "$lib/server/db/models";
import type { NotificationPreferences } from "$lib/types";
import { json, type RequestHandler } from "@sveltejs/kit";

export const PATCH: RequestHandler = async ({ request, locals }): Promise<Response> => {
  try {
    const { notificationPreferences } = await request.json() as { notificationPreferences: NotificationPreferences };

    const user = await User.findByPk(locals.user.id)

    if (!user) return json({ error: 'User not found' }, { status: 404 })



  } catch (error) {

  }





  return json({})
}
