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

export const DELETE: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { id } = await request.json() as { id: number };

    if (!id) {
      return json({
        success: false,
        message: 'Priority ID is required.'
      }, { status: 400 });
    }

    const priority = await models.Priority.findByPk(id, {
      include: [{
        model: models.Ticket,
        as: 'priorityTickets',
        attributes: ['id'],
        limit: 1
      }]
    });

    if (!priority) {
      return json({
        success: false,
        message: 'Priority not found.'
      }, { status: 404 });
    }

    if (priority.isDefault) {
      return json({
        success: false,
        message: 'Cannot delete the default priority. Set another priority as default first.'
      }, { status: 400 });
    }

    if (priority.priorityTickets && priority.priorityTickets.length > 0) {
      return json({
        success: false,
        message: 'Cannot delete priority with associated tickets. Please reassign or delete all tickets first.'
      }, { status: 400 });
    }

    const priorityCount = await models.Priority.count();

    if (priorityCount <= 1) {
      return json({
        success: false,
        message: 'Cannot delete the last priority. At least 1 priority is required.'
      }, { status: 400 });
    }

    await priority.destroy();

    return json({
      success: true,
      message: 'Priority deleted successfully.'
    });

  } catch (err) {
    console.error('Error deleting priority:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete priority.',
      error: errorMessage
    }, { status: 500 });
  }
};
