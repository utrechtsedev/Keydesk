import type { Transaction } from "sequelize";
import { sequelize } from "$lib/server/db/instance";
import { Config, Ticket } from "$lib/server/db/models";

export async function getTicketPrefix(): Promise<string> {
  const ticketPrefix = await Config.findOne({ where: { key: 'tickets' } })

  if (!ticketPrefix) return 'TKT-'

  return ticketPrefix.value.ticketPrefix
}

export async function generateTicketNumber(transaction?: Transaction): Promise<string> {
  const t = transaction || await sequelize.transaction();
  const shouldCommit = !transaction;

  try {
    const lastTicket = await Ticket.findOne({
      attributes: ['ticketNumber'],
      order: [['id', 'DESC']],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    let nextNumber: number;
    const startTicketingAt = await Config.findOne({ where: { key: "tickets" } })

    if (!startTicketingAt) {
      nextNumber = 1
    } else {
      nextNumber = startTicketingAt.value.nextTicketNumber
    }

    if (lastTicket?.ticketNumber) {
      const match = lastTicket.ticketNumber.match(/\d+/);
      if (match) nextNumber = parseInt(match[0]) + 1;
    }

    const ticketNumber = `${await getTicketPrefix()}${String(nextNumber).padStart(5, '0')}`;

    if (shouldCommit) await t.commit();
    return ticketNumber;
  } catch (error) {
    if (shouldCommit) await t.rollback();
    throw error;
  }
}

