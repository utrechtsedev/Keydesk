import { models } from "$lib/server/db/models";
import { type CategoryCreationAttributes } from "$lib/server/db/models/category.model";
import { error, json, type RequestHandler } from "@sveltejs/kit";


export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { categories } = await request.json() as { categories: CategoryCreationAttributes[] }

    if (!categories)
      return error(400, { message: 'Categories are required.' });

    if (categories.length < 1) return error(400, { message: 'You must at least have 1 category.' })

    const created = await models.Category.bulkCreate(categories, {
      updateOnDuplicate: ['name', 'description', 'prefix']
    })

    if (!created) {
      return error(400, { message: 'Something went wrong while inserting fields into the database.' });
    }

    return json({
      success: created ? true : false,
      data: categories,
    }, { status: created ? 201 : 400 });

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
  let categories = await models.Category.findAll()
  return json({
    success: true,
    data: categories,
  })
}
