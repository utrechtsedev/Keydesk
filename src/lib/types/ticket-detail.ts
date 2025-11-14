import type { Requester, Tag, Ticket, TicketAttachment, TicketMessage, User } from "./core"

export type TicketDetail = Ticket & {
  tags: Tag[];
  messages: TicketMessageDetail[];
  attachments: TicketAttachment[];
  requester: Requester;
}

export type TicketMessageDetail = TicketMessage & {
  messageUser: User | null;
  messageRequester: Requester | null;
  messageAttachments: TicketAttachment[]
}
