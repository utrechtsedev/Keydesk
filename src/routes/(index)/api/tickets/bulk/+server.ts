import { Tag, Ticket } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { ids, itemId, itemType } = await request.json() as {
      ids: number[],
      itemId: string,
      itemType: 'user' | 'category' | 'status' | 'priority' | 'tag'
    };

    if (!ids || !Array.isArray(ids) || ids.length < 1 || !itemId || !itemType) {
      return error(400, 'Some fields are missing. Please retry your request.');
    }

    let tickets;
    const where = { id: ids };

    switch (itemType) {
      case 'user':
        tickets = await Ticket.update({ assignedUserId: itemId }, { where });
        break;

      case 'category': {
        const categoryId = Number(itemId);
        if (isNaN(categoryId)) return error(400, 'Invalid category ID');
        tickets = await Ticket.update({ categoryId }, { where });
        break;
      }

      case 'status': {
        const statusId = Number(itemId);
        if (isNaN(statusId)) return error(400, 'Invalid status ID');
        tickets = await Ticket.update({ statusId }, { where });
        break;
      }

      case 'priority': {
        const priorityId = Number(itemId);
        if (isNaN(priorityId)) return error(400, 'Invalid priority ID');
        tickets = await Ticket.update({ priorityId }, { where });
        break;
      }
      case 'tag': {
        const tagId = Number(itemId);
        if (isNaN(tagId)) return error(400, 'Invalid tag ID');

        const tag = await Tag.findByPk(tagId);
        if (!tag) return error(404, 'Tag not found');

        const tickets = await Ticket.findAll({ where });

        await Promise.all(
          tickets.map(ticket => ticket.addTag(tagId))
        );

        return json({
          success: true,
          updatedCount: tickets.length,
          message: `Tag added to ${tickets.length} ticket(s)`
        }, { status: 200 });
      } default:
        return error(400, 'Invalid item type');
    }

    if (!tickets) {
      return error(400, 'No tickets were updated. Unknown error.');
    }

    return json({
      success: true,
      updated: tickets[0],
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to update tickets',
      error: errorMessage
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { ids } = await request.json() as { ids: number[] };

    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return error(400, 'Some fields are missing. Please retry your request.');
    }

    const tickets = await Ticket.destroy({ where: { id: ids } })

    if (!tickets) {
      return error(400, 'No tickets were deleted. Unknown error.');
    }

    return json({
      success: true,
      deleted: tickets,
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete tickets',
      error: errorMessage
    }, { status: 500 });
  }
}
