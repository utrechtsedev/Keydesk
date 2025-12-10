import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import type { NewCategory } from "$lib/server/db/schema";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { categories } = await request.json() as { categories: NewCategory[] };

    if (!categories) {
      return error(400, { message: 'Categories are required.' });
    }

    if (categories.length < 1) {
      return error(400, { message: 'You must at least have 1 category.' });
    }

    // Bulk upsert
    const created = await db
      .insert(schema.category)
      .values(categories)
      .onConflictDoUpdate({
        target: schema.category.id,
        set: {
          name: sql`EXCLUDED.name`,
          description: sql`EXCLUDED.description`,
          prefix: sql`EXCLUDED.prefix`,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!created || created.length === 0) {
      return error(400, { message: 'Something went wrong while inserting fields into the database.' });
    }

    return json({
      success: true,
      data: created,
    }, { status: 201 });

  } catch (err) {
    console.error('Error saving categories:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save categories configuration.',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async (): Promise<Response> => {
  try {
    const categories = await db
      .select()
      .from(schema.category);

    return json({
      success: true,
      data: categories,
    });

  } catch (err) {
    return json(
      {
        success: false,
        message: 'Failed to fetch categories',
        error: err instanceof Error ? err.message : 'Unknown error'
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
        message: 'Category ID is required.'
      }, { status: 400 });
    }

    // Check if category exists
    const [category] = await db
      .select()
      .from(schema.category)
      .where(eq(schema.category.id, id));

    if (!category) {
      return json({
        success: false,
        message: 'Category not found.'
      }, { status: 404 });
    }

    // Check if category has associated tickets
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.ticket)
      .where(eq(schema.ticket.categoryId, id));

    if (Number(ticketCount.count) > 0) {
      return json({
        success: false,
        message: 'Cannot delete category with associated tickets. Please reassign or delete all tickets first.'
      }, { status: 400 });
    }

    // Delete the category
    await db
      .delete(schema.category)
      .where(eq(schema.category.id, id));

    return json({
      success: true,
      message: 'Category deleted successfully.'
    });

  } catch (err) {
    console.error('Error deleting category:', err);

    // Handle foreign key constraint error
    if (err instanceof Error && err.message.includes('foreign key')) {
      return json({
        success: false,
        message: 'Cannot delete category with associated tickets.'
      }, { status: 400 });
    }

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete category.',
      error: errorMessage
    }, { status: 500 });
  }
};
