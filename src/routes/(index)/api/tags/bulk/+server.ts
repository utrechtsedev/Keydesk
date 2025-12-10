import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { tags, type, id } = await request.json() as {
      tags: string[],
      type: "ticket" | "task",
      id: number
    };

    if (!type || !id) {
      return json({ error: 'Invalid request' }, { status: 400 });
    }

    // Find the entity
    let entity;
    if (type === 'ticket') {
      const [ticket] = await db
        .select()
        .from(schema.ticket)
        .where(eq(schema.ticket.id, id));
      entity = ticket;
    } else if (type === 'task') {
      const [task] = await db
        .select()
        .from(schema.task)
        .where(eq(schema.task.id, id));
      entity = task;
    }

    if (!entity) {
      return json({ error: 'Entity not found' }, { status: 404 });
    }

    // Clear existing tags
    if (type === 'ticket') {
      await db
        .delete(schema.ticketTag)
        .where(eq(schema.ticketTag.ticketId, id));
    } else {
      await db
        .delete(schema.taskTag)
        .where(eq(schema.taskTag.taskId, id));
    }

    if (!tags || tags.length === 0) {
      return json({ success: true, tags: [] });
    }

    // Find or create tags
    const tagInstances = await Promise.all(
      tags.map(async (tagName) => {
        const normalizedName = tagName.trim().toLowerCase();

        // Try to insert, if conflict just fetch existing
        const [result] = await db
          .insert(schema.tag)
          .values({ name: normalizedName })
          .onConflictDoNothing({ target: schema.tag.name })
          .returning();

        if (result) {
          return result;
        }

        // If conflict occurred, fetch the existing tag
        const [existingTag] = await db
          .select()
          .from(schema.tag)
          .where(eq(schema.tag.name, normalizedName));

        return existingTag!;
      })
    );

    // Create associations
    if (type === 'ticket') {
      await db.insert(schema.ticketTag).values(
        tagInstances.map(tag => ({
          ticketId: id,
          tagId: tag.id
        }))
      );
    } else {
      await db.insert(schema.taskTag).values(
        tagInstances.map(tag => ({
          taskId: id,
          tagId: tag.id
        }))
      );
    }

    return json({ success: true, tags: tagInstances });

  } catch (err) {
    console.error('Error creating tags:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: errorMessage,
      error: errorMessage
    }, { status: 500 });
  }
};
