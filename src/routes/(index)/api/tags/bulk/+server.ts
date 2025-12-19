import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { NotFoundError, ValidationError } from '$lib/server/errors';
import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { tags, type, id } = await request.json() as {
    tags: string[],
    type: 'ticket' | 'task',
    id: number
  };

  if (!type || !id)
    throw new ValidationError('Type and ID are required');

  if (type !== 'ticket' && type !== 'task')
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

export const PATCH: RequestHandler = async ({ request }): Promise<Response> => {
  const { ids, tag, type } = await request.json() as {
    ids: number[],
    tag: string,
    type: 'ticket' | 'task'
  };

  if (!type || !ids || !Array.isArray(ids) || ids.length === 0)
    throw new ValidationError('Type and IDs array are required');

  if (!tag || !tag.trim())
    throw new ValidationError('Tag is required');

  if (type !== 'ticket' && type !== 'task')
    throw new ValidationError('Type must be either "ticket" or "task"');

  const normalizedTag = tag.trim().toLowerCase();

  // Get or create the tag
  let tagInstance;
  const [existingTag] = await db
    .select()
    .from(schema.tag)
    .where(eq(schema.tag.name, normalizedTag));

  if (existingTag) {
    tagInstance = existingTag;
  } else {
    const [newTag] = await db
      .insert(schema.tag)
      .values({ name: normalizedTag })
      .returning();
    tagInstance = newTag;
  }

  // Get existing associations to avoid duplicates
  let existingAssociations: number[] = [];

  if (type === 'ticket') {
    const existing = await db
      .select({ ticketId: schema.ticketTag.ticketId })
      .from(schema.ticketTag)
      .where(
        and(
          eq(schema.ticketTag.tagId, tagInstance.id),
          inArray(schema.ticketTag.ticketId, ids)
        )
      );
    existingAssociations = existing.map(e => e.ticketId);
  } else {
    const existing = await db
      .select({ taskId: schema.taskTag.taskId })
      .from(schema.taskTag)
      .where(
        and(
          eq(schema.taskTag.tagId, tagInstance.id),
          inArray(schema.taskTag.taskId, ids)
        )
      );
    existingAssociations = existing.map(e => e.taskId);
  }

  // Filter out IDs that already have this tag
  const idsToAdd = ids.filter(id => !existingAssociations.includes(id));

  if (idsToAdd.length === 0) {
    return json({
      success: true,
      message: 'Tag already exists on all specified items',
      addedCount: 0
    });
  }

  // Create new associations
  if (type === 'ticket') {
    await db.insert(schema.ticketTag).values(
      idsToAdd.map(ticketId => ({
        ticketId,
        tagId: tagInstance.id
      }))
    );
  } else {
    await db.insert(schema.taskTag).values(
      idsToAdd.map(taskId => ({
        taskId,
        tagId: tagInstance.id
      }))
    );
  }

  return json({
    success: true,
    tag: tagInstance,
    addedCount: idsToAdd.length,
    message: `Tag added to ${idsToAdd.length} ${type}(s)`
  });
};
