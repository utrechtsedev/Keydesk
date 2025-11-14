import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { Notification, UserNotification } from "$lib/server/db/models";

export const load: LayoutServerLoad = async ({ locals }) => {

  if (!locals.session || !locals.user) return redirect(303, '/login')

  const notifications = await UserNotification.findAll({
    where: {
      userId: locals.user.id,
      isRead: false
    },
    include: [
      {
        model: Notification,
        as: 'notification',
        required: true,
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 99
  });

  return {
    user: locals.user,
    notifications: notifications.map(n => n.toJSON())
  }
}
