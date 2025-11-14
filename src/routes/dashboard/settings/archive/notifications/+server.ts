import { models } from "$lib/server/db/models";
import type { NotificationSettings } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { notifications } = await request.json() as { notifications: NotificationSettings }

    if (!notifications)
      return error(400, { message: 'Notification settings are required.' });

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'notifications' },
      defaults: {
        key: 'notifications',
        value: JSON.stringify(notifications)
      }
    });

    if (!created) {
      await config.update({ value: JSON.stringify(notifications) });
    }

    return json({
      success: true,
      data: JSON.parse(config.value),
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
  let notifications = await models.Config.findOne({ where: { key: 'notifications' } })

  if (!notifications)
    return json({
      success: true,
      data: null,
    })

  return json({
    success: true,
    data: JSON.parse(notifications.value),
  })
}
