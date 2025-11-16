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
      data: created,
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
  try {
    let categories = await models.Category.findAll()
    return json({
      success: true,
      data: categories,
    })
  } catch (error) {
    return json(
      {
        success: false,
        message: 'Failed to fetch categories',
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
        message: 'Category ID is required.'
      }, { status: 400 });
    }

    const category = await models.Category.findByPk(id, {
      include: [{
        model: models.Ticket,
        as: 'categoryTickets',
        attributes: ['id'],
        limit: 1
      }]
    });

    if (!category) {
      return json({
        success: false,
        message: 'Category not found.'
      }, { status: 404 });
    }

    if (category.categoryTickets && category.categoryTickets.length > 0) {
      return json({
        success: false,
        message: 'Cannot delete category with associated tickets. Please reassign or delete all tickets first.'
      }, { status: 400 });
    }

    await category.destroy();

    return json({
      success: true,
      message: 'Category deleted successfully.'
    });

  } catch (err) {
    console.error('Error deleting category:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to delete category.',
      error: errorMessage
    }, { status: 500 });
  }
};
