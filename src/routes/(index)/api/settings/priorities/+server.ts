import { models, Priority } from "$lib/server/db/models";
import type { PriorityCreationAttributes } from "$lib/server/db/models/priority.model";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { priorities } = await request.json() as { priorities: PriorityCreationAttributes[] }

    if (!priorities)
      return error(400, { message: 'Priorities are required.' });

    if (priorities.length < 1) return error(400, { message: 'You must at least have 1 priority.' })

    const defaultPriorities = priorities.filter((p) => p.isDefault);

    if (defaultPriorities.length !== 1)
      return error(400, { message: 'You must only have 1 default priority.' });

    const created = await Priority.bulkCreate(priorities, {
      updateOnDuplicate: ['id', 'createdAt', 'updatedAt']
    });

    if (!created) {
      return error(400, { message: 'Something went wrong while inserting fields into the database.' });
    }

    return json({
      success: created ? true : false,
      data: created,
    }, { status: created ? 201 : 400 });

  } catch (err) {
    console.error('Error saving priorities:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save priorities configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    let priorities = await models.Priority.findAll()
    return json({
      success: true,
      data: priorities,
    })

  } catch (error) {
    return json(
      {
        success: false,
        message: 'Failed to fetch priorities',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  }
}
