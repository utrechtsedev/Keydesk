import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { NotFoundError, ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { tags, type, id } = await request.json() as {
    tags: string[],
    type: "ticket" | "task",
    id: number
  };

  if (!type || !id)
    throw new ValidationError('Type and ID are required');

  if (type !== "ticket" && type !== "task")
    throw new ValidationError('Type must be either "ticket" or "task"');

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

  if (!entity)
    throw new NotFoundError(`${type} not found`);

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

  const tagInstances = await Promise.all(
    tags.map(async (tagName) => {
      const normalizedName = tagName.trim().toLowerCase();

      // Check if tag exists
      const [existingTag] = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.name, normalizedName));

      if (existingTag) {
        return existingTag;
      }

      // Create new tag if it doesn't exist
      const [newTag] = await db
        .insert(schema.tag)
        .values({ name: normalizedName })
        .returning();

      return newTag;
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
};
