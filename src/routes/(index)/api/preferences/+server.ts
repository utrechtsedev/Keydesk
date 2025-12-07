import { User } from "$lib/server/db/models";
import type { User as UserType } from "$lib/types";
import { json, type RequestHandler } from "@sveltejs/kit";

export const PATCH: RequestHandler = async ({ request, locals }): Promise<Response> => {
  try {
    const { user } = await request.json() as { user: UserType };

    if (!user) return json({ error: 'JSON formatted incorrectly' }, { status: 401 })

    const findUser = await User.findByPk(locals.user.id)

    if (!findUser) return json({ error: 'User not found' }, { status: 404 })

    const updated = await findUser.update({
      name: user.name,
      email: user.email,
      notificationPreferences: user.notificationPreferences,
    })

    return json({ success: true, user: updated.toJSON() })

  } catch (error) {
    console.error('Error updating user:', error);
    return json({
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });

  }
}
