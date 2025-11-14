import { Ticket } from "$lib/server/db/models";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const ticketId = Number(params.id);

    if (isNaN(ticketId)) {
      return error(400, 'Invalid ticket ID');
    }

    const findTicket = await Ticket.findByPk(ticketId);

    if (!findTicket) {
      return error(404, 'Ticket not found');
    }

    const ticket = await request.json() as Partial<{
      requesterId: number;
      assignedUserId: string | null;
      subject: string;
      channel: "email" | "portal" | "user";
      statusId: number;
      priorityId: number;
      categoryId: number;
      firstResponseAt: Date | null;
      resolvedAt: Date | null;
      closedAt: Date | null;
      targetDate: Date;
      lastUserResponseAt: Date | null;
      lastRequesterResponseAt: Date | null;
      responseCount: number;
    }>;

    const { id, ticketNumber, createdAt, updatedAt, ...updateData } = ticket as any;

    await findTicket.update(updateData);

    await findTicket.reload();

    return json({
      success: true,
      ticket: findTicket.toJSON()
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return json({
      success: false,
      message: 'Failed to update ticket',
      error: errorMessage
    }, { status: 500 });
  }
};
