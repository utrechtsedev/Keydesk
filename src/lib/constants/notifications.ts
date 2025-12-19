export const NotificationMessages = {
  TICKET_CREATED: {
    dashboard: {
      allUsers: {
        title: 'New ticket',
        message: '#{ticketNumber}: {subject}'
      }
    },
    email: {
      allUsers: {
        title: 'New ticket #{ticketNumber}',
        message: 'A new ticket has been created: {subject}'
      },
      requester: {
        title: 'Your ticket #{ticketNumber} received',
        message: "We've received your request: {subject}"
      }
    }
  },

  TICKET_ASSIGNED: {
    dashboard: {
      user: {
        title: 'Ticket assigned to you',
        message: '#{ticketNumber}: {subject}'
      }
    },
    email: {
      user: {
        title: 'Assigned ticket #{ticketNumber}',
        message: "You've been assigned: {subject}"
      },
      requester: {
        title: 'Ticket #{ticketNumber} assigned',
        message: 'Your ticket has been assigned to {assigneeName}'
      }
    }
  },

  TICKET_UPDATED: {
    dashboard: {
      user: {
        title: 'Ticket updated',
        message: '#{ticketNumber} modified by {updatedBy}'
      }
    },
    email: {
      user: {
        title: 'Ticket #{ticketNumber} updated',
        message: '{updatedBy} made changes to this ticket'
      },
      requester: {
        title: 'Update on #{ticketNumber}',
        message: 'Your ticket has been updated: {subject}'
      }
    }
  },

  TICKET_RESOLVED: {
    dashboard: {
      user: {
        title: 'Ticket resolved',
        message: '#{ticketNumber} resolved by {resolvedBy}'
      }
    },
    email: {
      user: {
        title: 'Ticket #{ticketNumber} resolved',
        message: 'Resolved by {resolvedBy}'
      },
      requester: {
        title: 'Ticket #{ticketNumber} resolved',
        message: 'Your ticket has been resolved: {subject}'
      }
    }
  },

  TICKET_CLOSED: {
    dashboard: {
      user: {
        title: 'Ticket closed',
        message: '#{ticketNumber} closed by {closedBy}'
      }
    },
    email: {
      user: {
        title: 'Ticket #{ticketNumber} closed',
        message: 'Closed by {closedBy}'
      }
    }
  }
};
