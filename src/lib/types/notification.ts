type NotificationRecipient = 
  | { userId: number }
  | { userIds: number[] }
  | { allUsers: true }
  | { email: string };

type NotificationType = "info" | "success" | "warning" | "error" | "system";

type EntityNotification = {
  type: "entity";
  event: "created" | "assigned" | "updated" | "resolved" | "closed";
  entity: { type: "ticket"; id: number } | { type: "task"; id: number };
};

type SystemNotification = {
  type: NotificationType;
  event: "system";
  entity?: never;
};

export interface NotificationOptions {
  title: string;
  message: string;
  recipient: NotificationRecipient;
  channels: ("dashboard" | "email")[];
  notification: EntityNotification | SystemNotification;
}









