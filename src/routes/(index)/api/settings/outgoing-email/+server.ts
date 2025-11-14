import { decrypt, encrypt } from "$lib/server/db/encrypt";
import { models } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit"
import { type SMTP } from "$lib/types";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { smtp } = await request.json() as { smtp: SMTP };

    if (!smtp.senderName || !smtp.senderEmail || !smtp.host || !smtp.port) {
      return error(400, 'Please enter SMTP sender name, email, host and port.')
    }

    if (smtp.enableAuthentication && (!smtp.username || !smtp.password)) {
      return error(400, 'Please enter an SMTP username and password or disable SMTP authentication.')
    }


    if (smtp.password)
      smtp.password = encrypt(smtp.password)

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'smtp' },
      defaults: {
        key: 'smtp',
        value: JSON.stringify(smtp)
      }
    });

    if (!created) {
      await config.update({ value: JSON.stringify(smtp) });
    }

    return json({
      success: true,
      data: JSON.parse(config.value),
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving smtp configuration:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save smtp configuration',
      error: errorMessage
    }, { status: 500 });
  }
}

export const GET: RequestHandler = async () => {
  try {
    let smtp = await models.Config.findOne({ where: { key: 'smtp' } })

    if (!smtp)
      return json({
        success: true,
        data: null,
      })

    let response: SMTP = JSON.parse(smtp.value)

    response.password = decrypt(response.password)

    return json({
      success: true,
      data: response,
    })
  } catch (error) {
    return json(
      {
        success: false,
        message: 'Failed to fetch outgoing email settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  }
}
