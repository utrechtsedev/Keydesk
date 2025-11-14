import { Requester } from "$lib/server/db/models";
import { json, error, type RequestHandler } from "@sveltejs/kit";
import { Op } from "sequelize";

export const GET: RequestHandler = async ({ url }) => {
  try {
    const search = url.searchParams.get('search') || '';
    const limit = Number(url.searchParams.get('limit')) || 20;

    if (limit < 1 || limit > 100) {
      return error(400, { message: 'Limit must be between 1 and 100' });
    }

    if (search.length > 100) {
      return error(400, { message: 'Search query is too long' });
    }

    const whereClause = search ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const requesters = await Requester.findAll({
      where: whereClause,
      limit,
      order: [['name', 'ASC']],
    });

    return json({
      requesters: requesters.map(r => r.toJSON())
    });

  } catch (err) {
    console.error('Error searching requesters:', err);

    if (err instanceof Error) {
      if (err.name === 'SequelizeDatabaseError') {
        return error(500, { message: 'Database error occurred' });
      }
      if (err.name === 'SequelizeConnectionError') {
        return error(503, { message: 'Database connection failed' });
      }
    }

    return error(500, { message: 'Failed to search requesters' });
  }
};
