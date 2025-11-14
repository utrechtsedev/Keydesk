import type { TicketList } from "./ticket-list";
import type { Category, Priority, Status, Tag, User } from "./core";

export interface TicketPageData {
  tickets: TicketList[];
  pageCount: number;
  totalCount: number;
  users: User[];
  categories: Category[];
  statuses: Status[];
  priorities: Priority[];
  tags: Tag[];
}
