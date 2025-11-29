import { Task, Ticket, Tag } from "$lib/server/db/models";
import { json, type RequestHandler } from "@sveltejs/kit";

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
      entity = await Ticket.findByPk(id);
    } else if (type === 'task') {
      entity = await Task.findByPk(id);
    }

    if (!entity) {
      return json({ error: 'Entity not found' }, { status: 404 });
    }

    if (!tags || tags.length === 0) {
      await entity.setTags([]);
      return json({ success: true, tags: [] });
    }

    // Find or create tags
    const tagInstances = await Promise.all(
      tags.map(async (tagName) => {
        const normalizedName = tagName.trim().toLowerCase();
        const [tag] = await Tag.findOrCreate({
          where: { name: normalizedName },
          defaults: { name: normalizedName }
        });
        return tag;
      })
    );

    await entity.setTags(tagInstances);

    return json({ success: true, tags: tagInstances.map(t => t.toJSON()) });
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
