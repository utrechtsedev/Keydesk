let config = {
  "organization": {
    "name": "",
    "domain": "",
    "language": "en",
    "timezone": "Europe/Amsterdam"
  },

  "smtp": {
    "senderName": "",
    "senderEmail": "",
    "host": "",
    "port": 587,
    "enableAuthentication": "",
    "username": "",
    "password": "",
  },

  "imap": {
    "host": "",
    "port": 587,
    "username": "",
    "password": "",
  },

  "statuses": [
    {
      "id": 0,
      "name": "New",
      "color": "#3B82F6",
      "isDefault": true,
      "isClosed": false
    },
    {
      "id": 1,
      "name": "Open",
      "color": "#10B981",
      "isDefault": false,
      "isClosed": false
    },
    {
      "id": 2,
      "name": "Pending",
      "color": "#F59E0B",
      "isDefault": false,
      "isClosed": false
    },
    {
      "id": 3,
      "name": "On Hold",
      "color": "#8B5CF6",
      "isDefault": false,
      "isClosed": false
    },
    {
      "id": 4,
      "name": "Resolved",
      "color": "#059669",
      "isDefault": false,
      "isClosed": true
    },
    {
      "id": 5,
      "name": "Closed",
      "color": "#6B7280",
      "isDefault": false,
      "isClosed": true
    }
  ],

  "priorities": [
    {
      "id": 0,
      "name": "Low",
      "color": "#94A3B8",
      "order": 0
    },
    {
      "id": 1,
      "name": "Medium",
      "color": "#3B82F6",
      "order": 1,
      "isDefault": true
    },
    {
      "id": 2,
      "name": "High",
      "color": "#F59E0B",
      "order": 2
    },
    {
      "id": 3,
      "name": "Urgent",
      "color": "#EF4444",
      "order": 3
    }
  ],

  "categories": [
    {
      "id": 0,
      "name": "Technical Issue",
      "description": "Technical problems or bugs",
      "prefix": ""
    },
    {
      "id": 1,
      "name": "Modification Request",
      "description": "Requests for modification",
      "prefix": "CH"
    },
    {
      "id": 2,
      "name": "Question",
      "description": "General questions or how-to",
      "prefix": "Q"
    },
    {
      "id": 3,
      "name": "Incident",
      "description": "Service disruption or outage",
      "prefix": "I"
    },
    {
      "id": 4,
      "name": "Other",
      "description": "Miscellaneous requests",
      "prefix": "O"
    }
  ],

  "notifications": {
    // users only get notified when following actions have not been done by themselves except for created.notifyAllUsers
    "dashboard": {
      "ticket": {
        "created": {
          "notifyAllUsers": true,
        },
        "assigned": {
          "notifyUser": true
        },
        "updated": {
          "notifyUser": true
        },
        "resolved": {
          "notifyUser": true
        },
        "closed": {
          "notifyUser": true
        }
      }
    },

    "email": {
      "ticket": {
        "created": {
          "notifyAllUsers": true,
          "notifyRequester": true,
        },
        "assigned": {
          "notifyUser": true,
          "notifyRequester": true,
        },
        "updated": {
          "notifyUser": true,
          "notifyRequester": true,
        },
        "resolved": {
          "notifyUser": true,
          "notifyRequester": true,
        },
        "closed": {
          "notifyUser": true,
          "notifyRequester": false,
        },
      }
    },
  },

  "businessHours": {
    "schedule": {
      "monday": {
        "enabled": true,
        "start": "09:00",
        "end": "17:00"
      },
      "tuesday": {
        "enabled": true,
        "start": "09:00",
        "end": "17:00"
      },
      "wednesday": {
        "enabled": true,
        "start": "09:00",
        "end": "17:00"
      },
      "thursday": {
        "enabled": true,
        "start": "09:00",
        "end": "17:00"
      },
      "friday": {
        "enabled": true,
        "start": "09:00",
        "end": "17:00"
      },
      "saturday": {
        "enabled": false,
        "start": null,
        "end": null
      },
      "sunday": {
        "enabled": false,
        "start": null,
        "end": null
      }
    },

    "holidays": [
      {
        "id": 0,
        "name": "Christmas",
        "dateStart": "2025-12-25 00:00:00",
        "dateEnd": "2025-12-29 00:00:00"
      }
    ]
  },

  "portal": {
    "enabled": true,
    "allowGuestTickets": true,
    "requireEmailVerification": false,
    "showKnowledgeBase": true
  },

  "attachments": {
    "enabled": true,
    "maxFileSizeMB": 10,
    "allowedMimeTypes": [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "txt",
      "zip"
    ]
  },
  "tickets": {
    "nextTicketNumber": 0,
    "autoCreateRequesters": true,
    "ticketPrefix": "T",
  },
}

