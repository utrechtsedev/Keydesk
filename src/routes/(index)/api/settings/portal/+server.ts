import { models } from "$lib/server/db/models";
import type { Portal } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { portal } = await request.json() as { portal: Portal }

    if (!portal)
      return error(400, { message: 'Portal settings are required.' });

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'portal' },
      defaults: {
        key: 'portal',
        value: JSON.stringify(portal)
      }
    });

    if (!created) {
      await config.update({ value: JSON.stringify(portal) });
    }

    return json({
      success: true,
      data: JSON.parse(config.value),
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving portal settings:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save portal configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  let portal = await models.Config.findOne({ where: { key: 'portal' } })

  if (!portal)
    return json({
      success: true,
      data: null,
    })

  return json({
    success: true,
    data: JSON.parse(portal.value),
  })
}
