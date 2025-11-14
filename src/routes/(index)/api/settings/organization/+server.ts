import { models } from "$lib/server/db/models";
import type { Organization } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { organization } = await request.json() as { organization: Organization };

    if (!organization) {
      return error(400, { message: 'Organization data is required.' });
    }

    if (!organization.name || !organization.domain) {
      return error(400, { message: 'Organization name and domain are required' });
    }

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'organization' },
      defaults: {
        key: 'organization',
        value: JSON.stringify(organization)
      }
    });

    if (!created) {
      await config.update({ value: JSON.stringify(organization) });
    }

    return json({
      success: true,
      data: JSON.parse(config.value),
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving organization:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save organization settings',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    let organization = await models.Config.findOne({ where: { key: 'organization' } })


    if (!organization)
      return json({
        success: true,
        data: null,
      })

    return json({
      success: true,
      data: JSON.parse(organization.value),
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
