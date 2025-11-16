import { decrypt, encrypt } from "$lib/server/db/encrypt";
import { models } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit"
import { type IMAP } from "$lib/types";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { imap } = await request.json() as { imap: IMAP };

    if (!imap.host || !imap.port || !imap.username || !imap.password) {
      return error(400, 'Please enter IMAP details.');
    }

    if (imap.password)
      imap.password = encrypt(imap.password)

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'imap' },
      defaults: {
        key: 'imap',
        value: imap
      }
    });

    if (!created) {
      await config.update({ value: imap });
    }

    return json({
      success: true,
      data: config.value,
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving imap configuration:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save imap configuration',
      error: errorMessage
    }, { status: 500 });
  }
}

export const GET: RequestHandler = async () => {
  try {
    let imap = await models.Config.findOne({ where: { key: 'imap' } })

    if (!imap)
      return json({
        success: true,
        data: null,
      })

    let response: IMAP = imap.value

    response.password = decrypt(response.password)

    return json({
      success: true,
      data: response,
    })

  } catch (error) {
    return json(
      {
        success: false,
        message: 'Failed to fetch outgoing organization settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  }
}
