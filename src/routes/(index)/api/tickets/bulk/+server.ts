import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm";

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

    let updatedCount = 0;

    switch (itemType) {
      case 'user': {
        const result = await db
          .update(schema.ticket)
          .set({ assignedUserId: parseInt(itemId, 10) })
          .where(inArray(schema.ticket.id, ids))
          .returning();
        updatedCount = result.length;
        break;
      }
      case 'category': {
        const categoryId = Number(itemId);
        if (isNaN(categoryId)) return error(400, 'Invalid category ID');

        const result = await db
          .update(schema.ticket)
          .set({ categoryId })
          .where(inArray(schema.ticket.id, ids))
          .returning();
        updatedCount = result.length;
        break;
      }
      case 'status': {
        const statusId = Number(itemId);
        if (isNaN(statusId)) return error(400, 'Invalid status ID');

        const result = await db
          .update(schema.ticket)
          .set({ statusId })
          .where(inArray(schema.ticket.id, ids))
          .returning();
        updatedCount = result.length;
        break;
      }
      case 'priority': {
        const priorityId = Number(itemId);
        if (isNaN(priorityId)) return error(400, 'Invalid priority ID');

        const result = await db
          .update(schema.ticket)
          .set({ priorityId })
          .where(inArray(schema.ticket.id, ids))
          .returning();
        updatedCount = result.length;
        break;
      }
      case 'tag': {
        const tagId = Number(itemId);
        if (isNaN(tagId)) return error(400, 'Invalid tag ID');

        // Verify tag exists
        const [tag] = await db
          .select()
          .from(schema.tag)
          .where(eq(schema.tag.id, tagId));

        if (!tag) return error(404, 'Tag not found');

        // Add tag to all tickets (using onConflictDoNothing to prevent duplicates)
        await Promise.all(
          ids.map(ticketId =>
            db
              .insert(schema.ticketTag)
              .values({ ticketId, tagId })
              .onConflictDoNothing()
          )
        );

        return json({
          success: true,
          updatedCount: ids.length,
          message: `Tag added to ${ids.length} ticket(s)`
        }, { status: 200 });
      }
      default:
        return error(400, 'Invalid item type');
    }

    if (updatedCount === 0) {
      return error(400, 'No tickets were updated.');
    }

    return json({
      success: true,
      updated: updatedCount,
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

    const deleted = await db
      .delete(schema.ticket)
      .where(inArray(schema.ticket.id, ids))
      .returning();

    if (!deleted || deleted.length === 0) {
      return error(400, 'No tickets were deleted.');
    }

    return json({
      success: true,
      deleted: deleted.length,
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete tickets',
      error: errorMessage
    }, { status: 500 });
  }
};
