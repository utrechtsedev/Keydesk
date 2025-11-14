
import { models } from "$lib/server/db/models";
import type { BusinessHours } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";


export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { businessHours } = await request.json() as { businessHours: BusinessHours }

    if (!businessHours)
      return error(400, { message: 'Business hours are required.' });

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'businesshours' },
      defaults: {
        key: 'businesshours',
        value: businessHours
      }
    });

    if (!created) {
      await config.update({ value: businessHours });
    }

    return json({
      success: true,
      data: config.value,
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving business hours:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save business hours configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    let businessHours = await models.Config.findOne({ where: { key: 'businesshours' } })

    if (!businessHours)
      return json({
        success: true,
        data: null,
      })

    return json({
      success: true,
      data: businessHours.value,
    })
  } catch (error) {
    return json(
      {
        success: false,
        message: 'Failed to fetch business hours',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  }
}
