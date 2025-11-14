import { models } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import type { Attachment } from "$lib/types";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { attachments } = await request.json() as { attachments: Attachment }

    if (!attachments)
      return error(400, { message: 'Business hours are required.' });

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'attachments' },
      defaults: {
        key: 'attachments',
        value: attachments
      }
    });

    if (!created) {
      await config.update({ value: attachments });
    }

    return json({
      success: true,
      data: config.value,
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving attachment configuration:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save attachment configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    let attachments = await models.Config.findOne({ where: { key: 'attachments' } })

    if (!attachments)
      return json({
        success: true,
        data: null,
      })

    return json({
      success: true,
      data: attachments.value,
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
