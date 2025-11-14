import { models } from "$lib/server/db/models";
import type { Holiday } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";

type HolidayType = Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>;

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { holidays } = await request.json() as { holidays: HolidayType[] }

    if (!holidays)
      return error(400, { message: 'Notification settings are required.' });

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'holidays' },
      defaults: {
        key: 'holidays',
        value: holidays
      }
    });

    if (!created) {
      await config.update({ value: JSON.stringify(holidays) });
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
  let holidays = await models.Config.findOne({ where: { key: 'holidays' } })

  if (!holidays)
    return json({
      success: true,
      data: null,
    })

  return json({
    success: true,
    data: JSON.parse(holidays.value),
  })
}
