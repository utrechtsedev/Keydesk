import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { NotFoundError, ValidationError } from "$lib/server/errors";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const PATCH: RequestHandler = async ({ params, request }) => {
  const ticketId = Number(params.id);

  if (isNaN(ticketId))
    throw new ValidationError('Invalid ticket ID')

  const [findTicket] = await db
    .select()
    .from(schema.ticket)
    .where(eq(schema.ticket.id, ticketId));

  if (!findTicket)
    throw new NotFoundError('Ticket not found.')

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

  // Remove protected fields
  const { id, ticketNumber, createdAt, updatedAt, ...updateData } = ticket as any;

  // Convert date strings to Date objects
  const dateFields = ['firstResponseAt', 'resolvedAt', 'closedAt', 'targetDate', 'lastUserResponseAt', 'lastRequesterResponseAt'];

  for (const field of dateFields) {
    if (updateData[field] !== undefined && updateData[field] !== null) {
      updateData[field] = new Date(updateData[field]);
    }
  }

  // Parse assignedUserId to integer if it exists and is not null
  if (updateData.assignedUserId !== undefined && updateData.assignedUserId !== null) {
    updateData.assignedUserId = updateData.assignedUserId;
  }

  // Update the ticket
  const [updatedTicket] = await db
    .update(schema.ticket)
    .set(updateData)
    .where(eq(schema.ticket.id, ticketId))
    .returning();

  return json({
    success: true,
    ticket: updatedTicket
  }, { status: 200 });
};
