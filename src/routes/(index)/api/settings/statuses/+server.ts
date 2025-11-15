import { models } from "$lib/server/db/models";
import type { StatusCreationAttributes } from "$lib/server/db/models/status.model";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { statuses } = await request.json() as { statuses: StatusCreationAttributes[] }

    if (!statuses)
      return error(400, { message: 'Statuses are required.' });

    if (statuses.length < 2) return error(400, { message: 'You must at least have 2 statuses. 1 for open tickets, 1 for closed tickets' })

    const defaultStatuses = statuses.filter((s) => s.isDefault);

    if (defaultStatuses.length !== 1)
      return error(400, { message: 'You must only have 1 default status.' });

    const openStatuses = statuses.filter((s) => !s.isClosed);
    if (openStatuses.length < 1) return error(400, { message: 'You must have at least 1 open status.' });

    const closedStatuses = statuses.filter((s) => s.isClosed);
    if (closedStatuses.length < 1) return error(400, { message: 'You must have at least 1 closed status.' });

    const created = await models.Status.bulkCreate(statuses, {
      updateOnDuplicate: ['name', 'color', 'isDefault', 'isClosed']
    })

    if (!created) {
      return error(400, { message: 'Something went wrong while inserting fields into the database.' });
    }


    return json({
      success: created ? true : false,
      data: created,
    }, { status: created ? 201 : 400 });

  } catch (err) {
    console.error('Error saving statuses:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save statuses settings',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    const statuses = await models.Status.findAll();
    return json({
      success: true,
      data: statuses
    });
  } catch (error) {
    return json(
      {
        success: false,
        message: 'Failed to fetch statuses',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { id } = await request.json() as { id: number };

    if (!id) {
      return json({
        success: false,
        message: 'Status ID is required.'
      }, { status: 400 });
    }

    const status = await models.Status.findByPk(id, {
      include: [{
        model: models.Ticket,
        as: 'statusTickets',
        attributes: ['id'],
        limit: 1
      }]
    });

    if (!status) {
      return json({
        success: false,
        message: 'Status not found.'
      }, { status: 404 });
    }

    if (status.isDefault) {
      return json({
        success: false,
        message: 'Cannot delete the default status. Set another status as default first.'
      }, { status: 400 });
    }

    if (status.statusTickets && status.statusTickets.length > 0) {
      return json({
        success: false,
        message: 'Cannot delete status with associated tickets. Please reassign or delete all tickets first.'
      }, { status: 400 });
    }

    const openStatusCount = await models.Status.count({ where: { isClosed: false } });
    const closedStatusCount = await models.Status.count({ where: { isClosed: true } });

    if (!status.isClosed && openStatusCount <= 1) {
      return json({
        success: false,
        message: 'Cannot delete the last open status. At least 1 open status is required.'
      }, { status: 400 });
    }

    if (status.isClosed && closedStatusCount <= 1) {
      return json({
        success: false,
        message: 'Cannot delete the last closed status. At least 1 closed status is required.'
      }, { status: 400 });
    }

    await status.destroy();

    return json({
      success: true,
      message: 'Status deleted successfully.'
    });

  } catch (err) {
    console.error('Error deleting status:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete status.',
      error: errorMessage
    }, { status: 500 });
  }
};
