// ============================================================================
// NON-DATABASE TYPES
// ============================================================================

export interface SMTP {
  senderName: string;
  senderEmail: string;
  host: string;
  port: number;
  SSL: boolean;
  enableAuthentication: boolean;
  username?: string;
  password?: string;
}

export interface IMAP {
  host: string;
  port: number;
  SSL: boolean;
  username: string;
  password: string;
}

export interface Attachment {
  enabled: boolean;
  maxFileSizeMB?: number;
  allowedMimeTypes?: string[];
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

export interface Holiday {
  id?: number;
  name: string;
  start: Date;
  end: Date;
  createdAt?: Date;
  updatedAt?: Date;
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
  address: string;
  country: string;
  city: string;
  zipCode: string;
  language: string;
  timezone: string;
}

export interface Portal {
  enabled: boolean;
  allowGuestTickets: boolean;
  requireEmailVerification: boolean;
  showKnowledgeBase: boolean;
}

export interface TicketConfig {
  nextTicketNumber: number;
  autoCreateRequesters: boolean;
  ticketPrefix: string;
}

export interface NotificationPreferences {
  dashboard: {
    ticketCreated: boolean;
    itemAssigned: boolean;
    itemUpdated: boolean;
    itemClosed: boolean;
  };
  email: {
    ticketCreated: boolean;
    itemAssigned: boolean;
    itemUpdated: boolean;
    itemClosed: boolean;
  };
}







