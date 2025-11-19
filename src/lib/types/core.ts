export interface SMTP {
  senderName: string;
  senderEmail: string;
  host: string;
  port: number;
  SSL: boolean;
  enableAuthentication: boolean;
  username: string;
  password: string;
};

export interface IMAP {
  host: string;
  port: number;
  SSL: boolean;
  username: string;
  password: string;
};


export interface Attachment {
  enabled: boolean;
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
}

interface DaySchedule {
  enabled: boolean;
  start: string | null;
  end: string | null;
}

export interface BusinessHours {
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
}

export interface Category {
  id: number;
  name: string;
  description: string;
  prefix: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Holiday {
  id: number;
  name: string;
  start: Date;
  end: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  dashboard: {
    ticket: {
      created: {
        notifyAllUsers: boolean;
      };
      assigned: {
        notifyUser: boolean;
      };
      updated: {
        notifyUser: boolean;
      };
      resolved: {
        notifyUser: boolean;
      };
      closed: {
        notifyUser: boolean;
      };
    };
  };
  email: {
    ticket: {
      created: {
        notifyAllUsers: boolean;
        notifyRequester: boolean;
      };
      assigned: {
        notifyUser: boolean;
        notifyRequester: boolean;
      };
      updated: {
        notifyUser: boolean;
        notifyRequester: boolean;
      };
      resolved: {
        notifyUser: boolean;
        notifyRequester: boolean;
      };
      closed: {
        notifyUser: boolean;
        notifyRequester: boolean;
      };
    };
  };
}


export interface Organization {
  name: string;
  domain: string;
  language: string;
  timezone: string;
}

export interface Portal {
  enabled: boolean;
  allowGuestTickets: boolean;
  requireEmailVerification: boolean;
  showKnowledgeBase: boolean;
}

export interface Priority {
  id: number;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Status {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  // requester 
  requesterId: number;
  // assignment and ownership
  assignedUserId: string | null;
  // ticket content
  subject: string;
  channel: "email" | "portal" | "user";
  // classification
  statusId: number;
  priorityId: number;
  categoryId: number;
  // timing & sla
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  targetDate: Date;
  // workflow and tracking
  lastUserResponseAt: Date | null;
  lastRequesterResponseAt: Date | null;
  responseCount: number;
  // timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface Requester {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

type MessageSenderType = "requester" | "user" | "system";

export interface TicketMessage {
  id: number;
  ticketId: number;
  senderType: MessageSenderType;
  requesterId: number | null;
  senderName: string;
  senderEmail: string | null;
  userId: string | null;
  message: string;
  isPrivate: boolean;
  channel: "email" | "portal" | "system" | "api";
  isFirstFesponse: boolean;
  hasAttachments: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketAttachment {
  id: number;
  ticketId: number;
  messageId: number | null;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedByType: "requester" | "user";
  uploadedById: string;
  uploadedByName: string;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banExpires?: Date | null;
  banReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  // notification type
  type: "info" | "success" | "warning" | "error" | "ticket" | "system";
  // delivery channels
  channels: string; // JSON array: ["dashboard", "email"] or ["dashboard"] or ["email"]
  // optional: link to related entity
  relatedEntityType: "ticket" | "user" | "system" | null;
  relatedEntityId: number | null;
  actionUrl: string | null;
  // who created this notification
  createdById: string | null;
  // timestamps
  createdAt: Date;
  updatedAt: Date;
  // includes?
  userNotifications?: UserNotification[];
  creator?: User;
  relatedTicket?: Ticket;
}

export interface UserNotification {
  id: number;
  notificationId: number;
  userId: string;
  // dashboard status
  isRead: boolean;
  readAt: Date | null;
  // email status
  sentViaEmail: boolean;
  emailSentAt: Date | null;
  emailError: string | null;
  // timestamps
  createdAt: Date;
  updatedAt: Date;
  // includes?
  notification?: Notification
}

export interface TicketConfig {
  nextTicketNumber: number,
  autoCreateRequesters: boolean,
  ticketPrefix: string,
}


