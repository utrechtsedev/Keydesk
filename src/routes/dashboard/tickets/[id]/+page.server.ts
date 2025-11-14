import type { PageServerLoad } from "./$types";

import { Category, Priority, Requester, Status, Tag, Ticket, TicketAttachment, TicketMessage, User } from "$lib/server/db/models";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params, depends }) => {
  depends('app:ticket')
  const id = Number(params.id)

  const ticket = await Ticket.findOne({
    where: { id },
    include: [
      {
        model: Requester,
        as: 'requester'
      },
      {
        model: Status,
        as: 'status'
      },
      {
        model: Category,
        as: 'category'
      },
      {
        model: Priority,
        as: 'priority'
      },
      {
        model: Tag,
        as: 'tags'
      },
      {
        model: User,
        as: 'assignedUser'
      },
      {
        model: TicketMessage,
        as: 'messages',
        include: [
          {
            model: TicketAttachment,
            as: 'messageAttachments'
          },
          {
            model: User,
            as: 'messageUser'
          },
          {
            model: Requester,
            as: 'messageRequester'
          }
        ]
      },
    ],
    order: [
      [{ model: TicketMessage, as: 'messages' }, 'createdAt', 'DESC']
    ]
  })
  const priorities = await Priority.findAll()
  const users = await User.findAll()
  const statuses = await Status.findAll()
  const categories = await Category.findAll()

  if (!ticket || priorities.length < 1 || users.length < 1 || statuses.length < 1 || categories.length < 1)
    return redirect(301, '/dashboard')

  return {
    ticket: ticket.toJSON(),
    priorities: priorities.map(p => p.toJSON()),
    users: users.map(u => u.toJSON()),
    statuses: statuses.map(s => s.toJSON()),
    categories: categories.map(c => c.toJSON())
  };
}
