import { models } from "$lib/server/db/models";
import type { TicketConfig } from "$lib/types";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { tickets } = await request.json() as { tickets: TicketConfig };

    if (!tickets) {
      return error(400, { message: 'Ticket settings are required.' });
    }

    if (!tickets.ticketPrefix || !tickets.nextTicketNumber) {
      return error(400, { message: 'Ticket prefix and next number are required' });
    }

    const [config, created] = await models.Config.findOrCreate({
      where: { key: 'tickets' },
      defaults: {
        key: 'tickets',
        value: tickets
      }
    });

    if (!created) {
      await config.update({ value: tickets });
    }

    return json({
      success: true,
      data: config.value,
      created
    }, { status: created ? 201 : 200 });

  } catch (err) {
    console.error('Error saving tickets settings:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to save tickets settings',
      error: errorMessage
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    let tickets = await models.Config.findOne({ where: { key: 'tickets' } })


    if (!tickets)
      return json({
        success: true,
        data: null,
      })

    return json({
      success: true,
      data: tickets.value
    })
  } catch (error) {
    return json(
      {
        success: false,
        message: 'Failed to fetch tickets settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  }
}
