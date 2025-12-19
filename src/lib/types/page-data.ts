import type { TicketList } from './ticket-list';
import type { Category, Priority, Status, Tag, Task, User, UserNotification } from './core';

export interface PageData {
  user: User;
  notifications: UserNotification[]
}

export interface TicketPageData extends PageData {
  tickets: TicketList[];
  pageCount: number;
  totalCount: number;
  users: User[];
  categories: Category[];
  statuses: Status[];
  priorities: Priority[];
  tags: Tag[];
}

export interface TaskPageData extends PageData {
  tasks: Task[];
  task?: Task;
  finishedTasks: Task[];
  users: User[];
  statuses: Status[];
  priorities: Priority[];
  tags: Tag[];
}
