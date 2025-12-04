import { models } from "./models/index.js";
import { v4 as uuidv4 } from "uuid";
import type { User } from "./models/user.model.js";
import type { Requester } from "./models/requester.model.js";
import type { Status } from "./models/status.model.js";
import type { Priority } from "./models/priority.model.js";
import type { Category } from "./models/category.model.js";
import type { Tag } from "./models/tag.model.js";
import type { Notification } from "./models/notification.model.js";
import type { Ticket } from "./models/ticket.model.js";
import type { Task } from "./models/task.model.js";

/**
 * Advanced Database Seeder for Ticket System
 * 
 * Usage:
 * - Default: tsx seed-database.ts
 * - Custom: tsx seed-database.ts --tickets=50 --users=10 --clean
 * 
 * Options:
 * --clean: Drop all existing data before seeding
 * --tickets=N: Number of tickets to create (default: 20)
 * --users=N: Number of users to create (default: 5)
 * --requesters=N: Number of requesters to create (default: 15)
 * --notifications=N: Number of additional system notifications to create (default: 10)
 * --tasks=N: Number of tasks per user to create (default: 3)
 * --realistic: Use realistic time distributions and patterns
 * --quick: Skip attachments and use minimal messages
 */

interface SeederOptions {
  clean?: boolean;
  tickets?: number;
  users?: number;
  requesters?: number;
  notifications?: number;
  tasks?: number;
  realistic?: boolean;
  quick?: boolean;
  verbose?: boolean;
}

interface ProcessedOptions {
  clean: boolean;
  ticketCount: number;
  userCount: number;
  requesterCount: number;
  notificationCount: number;
  tasksPerUser: number;
  realistic: boolean;
  quick: boolean;
  verbose: boolean;
}

class DatabaseSeeder {
  private options: ProcessedOptions;
  private createdUsers: User[] = [];
  private createdRequesters: Requester[] = [];
  private existingStatuses: Status[] = [];
  private existingPriorities: Priority[] = [];
  private existingCategories: Category[] = [];
  private createdTags: Tag[] = [];
  private createdTickets: Ticket[] = [];
  private createdNotifications: Notification[] = [];
  private createdTasks: Task[] = [];

  constructor(options: SeederOptions = {}) {
    this.options = {
      clean: options.clean || false,
      ticketCount: options.tickets || 20,
      userCount: options.users || 5,
      requesterCount: options.requesters || 15,
      notificationCount: options.notifications || 10,
      tasksPerUser: options.tasks || 3,
      realistic: options.realistic || false,
      quick: options.quick || false,
      verbose: options.verbose !== false,
    };
  }

  private log(message: string, data: unknown = null): void {
    if (this.options.verbose) {
      console.log(`[SEED] ${message}`);
      if (data) console.log(data);
    }
  }

  private getSampleSubjects(): string[] {
    return [
      "Unable to login to customer portal",
      "Question about invoice #INV-2024-{num}",
      "Feature request: Dark mode for mobile app",
      "Password reset not working",
      "Email notifications not arriving",
      "API returning 500 errors",
      "Account upgrade issue",
      "Missing payment confirmation",
      "Bug: Dashboard displays incorrect data",
      "Integration with {service} failing",
      "Export function timing out",
      "Two-factor authentication problem",
      "Slow page load times",
      "Unable to upload files larger than 10MB",
      "Request for data deletion (GDPR)",
      "Discount code not applying at checkout",
      "Mobile app crashes on startup",
      "Incorrect timezone in reports",
      "Need help configuring webhooks",
      "User permissions not saving",
    ];
  }

  private getSampleDescriptions(): string[] {
    return [
      "I've been trying to resolve this issue for the past hour but haven't had any success. Can you please help?",
      "This has been an ongoing problem for several days now. Multiple team members are affected.",
      "I noticed this issue when trying to complete a critical task. It's blocking our workflow.",
      "Could you please look into this at your earliest convenience? It's affecting our production environment.",
      "We need this resolved urgently as it's impacting our customer-facing operations.",
      "I've tried the troubleshooting steps in the documentation but the problem persists.",
      "This started happening after the recent update. Everything was working fine before.",
      "Several users have reported the same issue. It seems to be a widespread problem.",
      "I'm not sure if this is a bug or expected behavior. Could you clarify?",
      "This feature would greatly improve our team's productivity and workflow.",
    ];
  }

  private getSampleMessages(): {
    requester: string[];
    user: string[];
    system: string[];
  } {
    return {
      requester: [
        "Thank you for your help! That solved the issue.",
        "I'm still experiencing the same problem. Could you provide more details?",
        "This workaround works for now, but is there a permanent fix coming?",
        "Perfect! Everything is working as expected now.",
        "I tried your suggestion but I'm getting a different error now.",
        "Could you clarify what you mean by that? I'm not sure I understand.",
        "That makes sense. I'll try it and let you know how it goes.",
        "This is quite urgent for us. When can we expect a resolution?",
      ],
      user: [
        "Thank you for reaching out. I'm looking into this issue now.",
        "I've identified the problem and I'm working on a solution.",
        "Could you provide some additional information to help troubleshoot this?",
        "I've escalated this to our development team for further investigation.",
        "This issue has been resolved. Please try again and let me know if you encounter any problems.",
        "I've applied a fix on our end. The changes should take effect within a few minutes.",
        "Let me walk you through the steps to resolve this.",
        "I've forwarded this request to the appropriate team for review.",
      ],
      system: [
        "Ticket automatically assigned based on category.",
        "Ticket forwarded to {team} for review.",
        "SLA warning: Response time approaching target.",
        "Ticket merged with #{ticket}.",
        "Priority automatically escalated due to age.",
      ],
    };
  }

  private getSampleTaskTitles(): string[] {
    return [
      "Update API documentation",
      "Review customer feedback from last sprint",
      "Fix memory leak in notification service",
      "Prepare Q4 performance report",
      "Conduct security audit",
      "Optimize database queries",
      "Update dependencies to latest versions",
      "Create user guide for new feature",
      "Set up CI/CD pipeline",
      "Refactor authentication module",
      "Design new dashboard layout",
      "Investigate slow page load times",
      "Add unit tests for payment module",
      "Configure monitoring alerts",
      "Review and merge pending PRs",
      "Update team wiki documentation",
      "Schedule customer onboarding call",
      "Analyze server logs for errors",
      "Prepare demo for stakeholders",
      "Research competitor features",
      "Clean up technical debt in codebase",
      "Configure backup automation",
      "Update privacy policy documentation",
      "Train new team member on system",
      "Migrate legacy data to new format",
      "Implement caching layer",
      "Review accessibility compliance",
      "Update error handling",
      "Optimize image loading",
      "Create API client library",
    ];
  }

  private getSampleTaskDescriptions(): string[] {
    return [
      "This needs to be completed before the end of the sprint.",
      "High priority - blocking other work.",
      "Follow up on the discussion from yesterday's meeting.",
      "Make sure to test thoroughly before deploying.",
      "Coordinate with the backend team on this.",
      "Should be straightforward, similar to what we did last month.",
      "Need to review the requirements document first.",
      "Low priority - can be deferred if needed.",
      "This is part of the larger initiative we discussed.",
      "Breaking this down into smaller subtasks would help.",
    ];
  }

  private getSampleSubtaskTitles(): string[] {
    return [
      "Research approach",
      "Create initial draft",
      "Review with team",
      "Implement feedback",
      "Final testing",
      "Update documentation",
      "Deploy changes",
      "Verify in production",
      "Code review",
      "Write tests",
      "Update changelog",
      "Notify stakeholders",
    ];
  }

  private getNotificationTemplates(): {
    type: "info" | "success" | "warning" | "error" | "ticket" | "system";
    title: string;
    message: string;
    channel: "email" | "dashboard";
  }[] {
    return [
      {
        type: "ticket",
        title: "New ticket assigned to you",
        message: "You have been assigned ticket #{ticketNumber}: {subject}",
        channel: "email",
      },
      {
        type: "ticket",
        title: "Ticket updated",
        message: "Ticket #{ticketNumber} has been updated by {userName}",
        channel: "dashboard",
      },
      {
        type: "ticket",
        title: "New response on your ticket",
        message: "{userName} responded to ticket #{ticketNumber}",
        channel: "email",
      },
      {
        type: "warning",
        title: "SLA deadline approaching",
        message: "Ticket #{ticketNumber} is approaching its SLA deadline",
        channel: "dashboard",
      },
      {
        type: "error",
        title: "SLA deadline exceeded",
        message: "Ticket #{ticketNumber} has exceeded its SLA deadline",
        channel: "dashboard",
      },
      {
        type: "success",
        title: "Ticket resolved",
        message: "Ticket #{ticketNumber} has been marked as resolved",
        channel: "dashboard",
      },
      {
        type: "ticket",
        title: "Priority changed",
        message: "The priority of ticket #{ticketNumber} has been changed to {priority}",
        channel: "dashboard",
      },
      {
        type: "system",
        title: "System maintenance scheduled",
        message: "The ticket system will undergo maintenance on {date}",
        channel: "email",
      },
      {
        type: "info",
        title: "New feature available",
        message: "A new feature has been added to the ticket system: {feature}",
        channel: "dashboard",
      },
      {
        type: "warning",
        title: "High ticket volume",
        message: "Your team has {count} unassigned tickets requiring attention",
        channel: "dashboard",
      },
    ];
  }

  private getDutchNames(): { firstNames: string[]; lastNames: string[] } {
    const firstNames = [
      "Jan", "Pieter", "Klaas", "Daan", "Sven", "Lars", "Bram", "Thijs",
      "Emma", "Sophie", "Lisa", "Anna", "Eva", "Sarah", "Julia", "Mila",
    ];
    const lastNames = [
      "van de Berg", "de Vries", "Jansen", "Bakker", "Visser", "Smit",
      "Meijer", "de Boer", "Mulder", "de Groot", "Bos", "Vos", "Peters",
    ];
    return { firstNames, lastNames };
  }

  private async cleanDatabase(): Promise<void> {
    this.log("Cleaning user data from database...");

    try {
      await models.UserNotification.destroy({ where: {}, truncate: true, cascade: true });
      await models.Notification.destroy({ where: {}, truncate: true, cascade: true });
      await models.TicketAttachment.destroy({ where: {}, truncate: true, cascade: true });
      await models.TicketMessage.destroy({ where: {}, truncate: true, cascade: true });
      await models.Ticket.destroy({ where: {}, truncate: true, cascade: true });
      await models.Requester.destroy({ where: {}, truncate: true, cascade: true });
      await models.User.destroy({ where: {}, truncate: true, cascade: true });

      if (models.Task) {
        await models.Task.destroy({ where: {}, truncate: true, cascade: true });
      }

      if (models.Tag) {
        await models.Tag.destroy({ where: {}, truncate: true, cascade: true });
      }

      this.log("✓ User data cleaned successfully");
    } catch (error) {
      this.log("Error cleaning database:", (error as Error).message);
      throw error;
    }
  }

  private async fetchExistingData(): Promise<void> {
    this.log("Fetching existing statuses, priorities, and categories...");

    try {
      this.existingStatuses = await models.Status.findAll();
      this.existingPriorities = await models.Priority.findAll();
      this.existingCategories = await models.Category.findAll();

      if (this.existingStatuses.length === 0) {
        throw new Error("No statuses found in database. Please create statuses first.");
      }
      if (this.existingPriorities.length === 0) {
        throw new Error("No priorities found in database. Please create priorities first.");
      }
      if (this.existingCategories.length === 0) {
        throw new Error("No categories found in database. Please create categories first.");
      }

      this.log(`✓ Found ${this.existingStatuses.length} statuses, ${this.existingPriorities.length} priorities, ${this.existingCategories.length} categories`);
    } catch (error) {
      this.log("Error fetching existing data:", (error as Error).message);
      throw error;
    }
  }

  private async createTags(): Promise<void> {
    this.log("Creating tags...");

    const tags = [
      "login", "portal", "invoice", "question", "feature-request",
      "mobile", "ui", "api", "urgent", "bug", "password", "email",
      "integration", "performance", "security", "documentation",
    ];

    if (models.Tag) {
      for (const tagName of tags) {
        const created = await models.Tag.create({
          name: tagName,
        });
        this.createdTags.push(created);
      }

      this.log(`✓ Created ${this.createdTags.length} tags`);
    }
  }

  private async createUsers(): Promise<void> {
    this.log(`Creating ${this.options.userCount} users...`);

    const { firstNames, lastNames } = this.getDutchNames();
    const departments = ["Technical Support", "Billing", "Product", "Customer Success"];

    for (let i = 0; i < this.options.userCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, '')}@company.nl`;

      const user = await models.User.create({
        id: uuidv4(),
        name,
        email,
        emailVerified: true,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`,
        department: departments[Math.floor(Math.random() * departments.length)],
        role: i === 0 ? "admin" : "user",
        banned: false,
        banReason: null,
        banExpires: null,
      });

      this.createdUsers.push(user);
    }

    this.log(`✓ Created ${this.createdUsers.length} users`);
  }

  private async createRequesters(): Promise<void> {
    this.log(`Creating ${this.options.requesterCount} requesters...`);

    const { firstNames, lastNames } = this.getDutchNames();
    const companies = ["example.com", "business.nl", "company.com", "tech.nl"];

    for (let i = 0; i < this.options.requesterCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      const company = companies[Math.floor(Math.random() * companies.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, '')}@${company}`;
      const hasPhone = Math.random() > 0.3;

      const requester = await models.Requester.create({
        name,
        email,
        phone: hasPhone ? `+31 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 9000000 + 1000000)}` : null,
      });

      this.createdRequesters.push(requester);
    }

    this.log(`✓ Created ${this.createdRequesters.length} requesters`);
  }

  private getRealisticDate(daysAgo: number, variation: number = 0): Date {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - daysAgo);

    if (variation > 0) {
      const variationMs = variation * 24 * 60 * 60 * 1000;
      targetDate.setTime(targetDate.getTime() + (Math.random() * variationMs * 2 - variationMs));
    }

    return targetDate;
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private async createTickets(): Promise<void> {
    this.log(`Creating ${this.options.ticketCount} tickets...`);

    const subjects = this.getSampleSubjects();
    const descriptions = this.getSampleDescriptions();
    const messages = this.getSampleMessages();
    const ticketChannels: ("email" | "portal" | "user")[] = ["email", "portal", "user"];
    const messageChannels: ("email" | "portal" | "system" | "api" | "dashboard")[] = ["email", "portal", "dashboard"];

    let ticketsCreated = 0;

    for (let i = 0; i < this.options.ticketCount; i++) {
      const ticketAge = this.options.realistic
        ? Math.floor(Math.random() * 30)
        : Math.floor(Math.random() * 7);

      const createdAt = this.getRealisticDate(ticketAge, 0.5);

      const requester = this.getRandomElement(this.createdRequesters);
      const assignedUser = Math.random() > 0.1 ? this.getRandomElement(this.createdUsers) : null;
      const status = this.getRandomElement(this.existingStatuses);
      const priority = this.getRandomElement(this.existingPriorities);
      const category = this.getRandomElement(this.existingCategories);
      const ticketChannel = this.getRandomElement(ticketChannels);
      const messageChannel = this.getRandomElement(messageChannels);

      let subject = this.getRandomElement(subjects);
      subject = subject.replace("{num}", String(Math.floor(Math.random() * 9000 + 1000)));
      subject = subject.replace("{service}", ["Slack", "GitHub", "Salesforce"][Math.floor(Math.random() * 3)]);

      const description = this.getRandomElement(descriptions);

      const targetDate = new Date(createdAt);
      const hoursToAdd = priority.name === "Critical" ? 4 :
        priority.name === "High" ? 8 :
          priority.name === "Medium" ? 24 : 48;
      targetDate.setHours(targetDate.getHours() + hoursToAdd);

      const ticket = await models.Ticket.create({
        ticketNumber: `TKT-${String(i + 1).padStart(4, '0')}`,
        requesterId: requester.id,
        assignedUserId: assignedUser?.id || null,
        subject,
        channel: ticketChannel,
        statusId: status.id,
        priorityId: priority.id,
        categoryId: category.id,
        targetDate: targetDate,
        responseCount: 1,
        createdAt,
        updatedAt: createdAt,
      });

      this.createdTickets.push(ticket);

      let messageCount = 0;
      const firstMessage = await models.TicketMessage.create({
        ticketId: ticket.id,
        senderType: "requester",
        requesterId: requester.id,
        userId: null,
        senderName: requester.name || "Unknown",
        senderEmail: requester.email,
        message: description,
        isPrivate: false,
        channel: messageChannel,
        isFirstResponse: false,
        hasAttachments: !this.options.quick && Math.random() > 0.7,
        createdAt,
        updatedAt: createdAt,
      });
      messageCount++;

      if (firstMessage.hasAttachments && !this.options.quick) {
        await this.createAttachments(ticket.id, firstMessage.id, requester, "requester", createdAt);
      }

      if (assignedUser) {
        await this.createTicketNotification(
          "ticket",
          "New ticket assigned to you",
          `You have been assigned ticket ${ticket.ticketNumber}: ${subject}`,
          "email",
          ticket,
          [assignedUser],
          createdAt
        );
      }

      if (status.name !== "New" && !this.options.quick) {
        const numMessages = Math.floor(Math.random() * 5) + 2;
        let currentDate = new Date(createdAt);
        let isFirstResponse = true;

        for (let m = 0; m < numMessages; m++) {
          const isUser = m % 2 === 0;
          currentDate = new Date(currentDate.getTime() + (Math.random() * 4 + 1) * 60 * 60 * 1000);

          if (isUser && assignedUser) {
            const userMessage = await models.TicketMessage.create({
              ticketId: ticket.id,
              senderType: "user",
              requesterId: null,
              userId: assignedUser.id,
              senderName: assignedUser.name.split(' ')[0],
              senderEmail: assignedUser.email,
              message: this.getRandomElement(messages.user),
              isPrivate: Math.random() > 0.8,
              channel: "email",
              isFirstResponse: isFirstResponse,
              hasAttachments: Math.random() > 0.9,
              createdAt: currentDate,
              updatedAt: currentDate,
            });

            if (isFirstResponse) {
              isFirstResponse = false;
              await ticket.update({ firstResponseAt: currentDate });
            }

            await ticket.update({ lastUserResponseAt: currentDate });
            messageCount++;

            if (userMessage.hasAttachments) {
              await this.createAttachments(ticket.id, userMessage.id, assignedUser, "user", currentDate);
            }
          } else {
            const requesterMessage = await models.TicketMessage.create({
              ticketId: ticket.id,
              senderType: "requester",
              requesterId: requester.id,
              userId: null,
              senderName: requester.name || "Unknown",
              senderEmail: requester.email,
              message: this.getRandomElement(messages.requester),
              isPrivate: false,
              channel: messageChannel,
              isFirstResponse: false,
              hasAttachments: false,
              createdAt: currentDate,
              updatedAt: currentDate,
            });

            await ticket.update({ lastRequesterResponseAt: currentDate });
            messageCount++;

            if (assignedUser && Math.random() > 0.5) {
              await this.createTicketNotification(
                "ticket",
                "New response on your ticket",
                `${requester.name} responded to ticket ${ticket.ticketNumber}`,
                "dashboard",
                ticket,
                [assignedUser],
                currentDate
              );
            }
          }
        }

        await ticket.update({
          responseCount: messageCount,
          updatedAt: currentDate,
        });

        if (["Resolved", "Closed"].includes(status.name)) {
          await ticket.update({
            resolvedAt: currentDate,
            closedAt: status.name === "Closed" ? currentDate : null,
          });

          if (assignedUser) {
            await this.createTicketNotification(
              "success",
              "Ticket resolved",
              `Ticket ${ticket.ticketNumber} has been marked as resolved`,
              "dashboard",
              ticket,
              [assignedUser],
              currentDate
            );
          }
        }

        if (Math.random() > 0.7 && assignedUser) {
          const warningDate = new Date(currentDate.getTime() - (2 * 60 * 60 * 1000));
          await this.createTicketNotification(
            "warning",
            "SLA deadline approaching",
            `Ticket ${ticket.ticketNumber} is approaching its SLA deadline`,
            "email",
            ticket,
            [assignedUser],
            warningDate
          );
        }
      }

      ticketsCreated++;
      if (ticketsCreated % 10 === 0) {
        this.log(`  ${ticketsCreated}/${this.options.ticketCount} tickets created...`);
      }
    }

    this.log(`✓ Created ${ticketsCreated} tickets with messages`);
  }

  private async createAttachments(
    ticketId: number,
    messageId: number,
    uploader: User | Requester,
    uploaderType: "requester" | "user",
    createdAt: Date
  ): Promise<void> {
    const fileTypes = [
      { ext: "png", mime: "image/png", minSize: 100000, maxSize: 1000000 },
      { ext: "jpg", mime: "image/jpeg", minSize: 150000, maxSize: 800000 },
      { ext: "pdf", mime: "application/pdf", minSize: 100000, maxSize: 2000000 },
      { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", minSize: 50000, maxSize: 500000 },
      { ext: "txt", mime: "text/plain", minSize: 1000, maxSize: 50000 },
    ];

    const fileNames = [
      "screenshot", "error-log", "invoice", "report", "diagram",
      "console-output", "configuration", "debug-info", "example",
    ];

    const numAttachments = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < numAttachments; i++) {
      const fileType = this.getRandomElement(fileTypes);
      const fileName = this.getRandomElement(fileNames);
      const hashedName = uuidv4().replace(/-/g, '');
      const fileSize = Math.floor(Math.random() * (fileType.maxSize - fileType.minSize)) + fileType.minSize;

      await models.TicketAttachment.create({
        ticketId: ticketId,
        messageId: messageId,
        fileName: `${hashedName}.${fileType.ext}`,
        originalFileName: `${fileName}.${fileType.ext}`,
        filePath: `/uploads/tickets/${ticketId}/${hashedName}.${fileType.ext}`,
        fileSize: fileSize,
        mimeType: fileType.mime,
        uploadedByType: uploaderType,
        uploadedById: String(uploader.id),
        uploadedByName: uploader.name || "Unknown",
        downloadCount: Math.floor(Math.random() * 5),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  private async createTicketNotification(
    type: "info" | "success" | "warning" | "error" | "ticket" | "system",
    title: string,
    message: string,
    channel: "email" | "dashboard",
    ticket: Ticket,
    recipients: User[],
    createdAt: Date
  ): Promise<void> {
    const notification = await models.Notification.create({
      title,
      message,
      type,
      channel,
      relatedEntityType: "ticket",
      relatedEntityId: ticket.id,
      actionUrl: `/dashboard/tickets/${ticket.id}`,
      createdById: null,
      createdAt,
      updatedAt: createdAt,
    });

    this.createdNotifications.push(notification);

    for (const user of recipients) {
      const shouldSendEmail = channel === "email";
      const emailSent = shouldSendEmail && Math.random() > 0.1;

      await models.UserNotification.create({
        notificationId: notification.id,
        userId: user.id,
        isRead: Math.random() > 0.6,
        readAt: Math.random() > 0.6 ? new Date(createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null,
        sentViaEmail: emailSent,
        emailSentAt: emailSent ? new Date(createdAt.getTime() + Math.random() * 5 * 60 * 1000) : null,
        emailError: !emailSent && shouldSendEmail ? "SMTP connection timeout" : null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  private async createSystemNotifications(): Promise<void> {
    this.log(`Creating ${this.options.notificationCount} system notifications...`);

    const templates = this.getNotificationTemplates();
    const systemTemplates = templates.filter(t => t.type === "system" || t.type === "info");

    let notificationsCreated = 0;

    for (let i = 0; i < this.options.notificationCount; i++) {
      const template = this.getRandomElement(systemTemplates);
      const daysAgo = Math.floor(Math.random() * 14);
      const createdAt = this.getRealisticDate(daysAgo, 0.2);

      let message = template.message;
      message = message.replace("{date}", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString());
      message = message.replace("{feature}", ["Advanced Search", "Bulk Actions", "Custom Fields", "Email Templates"][Math.floor(Math.random() * 4)]);
      message = message.replace("{count}", String(Math.floor(Math.random() * 20) + 5));

      const notification = await models.Notification.create({
        title: template.title,
        message,
        type: template.type,
        channel: template.channel,
        relatedEntityType: "system",
        relatedEntityId: null,
        actionUrl: null,
        createdById: null,
        createdAt,
        updatedAt: createdAt,
      });

      this.createdNotifications.push(notification);

      const numRecipients = Math.floor(Math.random() * (this.createdUsers.length / 2)) + Math.ceil(this.createdUsers.length / 2);
      const recipients = this.shuffleArray([...this.createdUsers]).slice(0, numRecipients);

      for (const user of recipients) {
        const shouldSendEmail = template.channel === "email";
        const emailSent = shouldSendEmail && Math.random() > 0.05;

        await models.UserNotification.create({
          notificationId: notification.id,
          userId: user.id,
          isRead: Math.random() > 0.5,
          readAt: Math.random() > 0.5 ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null,
          sentViaEmail: emailSent,
          emailSentAt: emailSent ? new Date(createdAt.getTime() + Math.random() * 10 * 60 * 1000) : null,
          emailError: !emailSent && shouldSendEmail ? ["Network error", "Invalid email", "Recipient blocked"][Math.floor(Math.random() * 3)] : null,
          createdAt,
          updatedAt: createdAt,
        });
      }

      notificationsCreated++;
    }

    this.log(`✓ Created ${notificationsCreated} system notifications`);
  }

  private async createTasks(): Promise<void> {
    if (!models.Task) {
      this.log("⚠ Task model not found, skipping task creation");
      return;
    }

    this.log(`Creating tasks for users...`);

    const titles = this.getSampleTaskTitles();
    const descriptions = this.getSampleTaskDescriptions();
    const subtaskTitles = this.getSampleSubtaskTitles();

    const totalTasks = this.createdUsers.length * this.options.tasksPerUser;

    let tasksCreated = 0;
    const rootTasks: Task[] = [];

    // Create main tasks
    for (let i = 0; i < totalTasks; i++) {
      const taskAge = this.options.realistic
        ? Math.floor(Math.random() * 21)
        : Math.floor(Math.random() * 7);

      const createdAt = this.getRealisticDate(taskAge, 0.3);

      // 30% of tasks are attached to tickets, 70% standalone
      const ticket = Math.random() < 0.3 && this.createdTickets.length > 0
        ? this.getRandomElement(this.createdTickets)
        : null;

      const creator = this.getRandomElement(this.createdUsers);
      const status = this.getRandomElement(this.existingStatuses);
      const priority = this.getRandomElement(this.existingPriorities);

      const title = this.getRandomElement(titles);
      const description = Math.random() > 0.3 ? this.getRandomElement(descriptions) : null;

      // Due date: 1-14 days from creation
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 1);

      // Start date: sometimes set, sometimes null
      const startDate = Math.random() > 0.4 ? new Date(createdAt) : null;
      if (startDate && Math.random() > 0.5) {
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 3));
      }

      // Completed date for resolved/closed tasks
      let completedAt = null;
      if (["Resolved", "Closed"].includes(status.name)) {
        completedAt = new Date(createdAt);
        completedAt.setDate(completedAt.getDate() + Math.floor(Math.random() * 7) + 1);
      }

      // Assign a single user (mandatory)
      const assignee = this.getRandomElement(this.createdUsers);

      const task = await models.Task.create({
        title,
        description,
        ticketId: ticket?.id || null,
        parentTaskId: null,
        createdById: creator.id,
        assigneeId: assignee.id,
        statusId: status.id,
        priorityId: priority.id,
        dueDate,
        startDate,
        completedAt,
        position: i,
        createdAt,
        updatedAt: completedAt || createdAt,
      });

      this.createdTasks.push(task);
      rootTasks.push(task);

      // Add tags occasionally (40% chance)
      if (Math.random() > 0.6 && this.createdTags.length > 0) {
        const numTags = Math.floor(Math.random() * 3) + 1;
        const tags = this.shuffleArray([...this.createdTags]).slice(0, numTags);
        await task.setTags(tags);
      }

      tasksCreated++;

      if (tasksCreated % 20 === 0) {
        this.log(`  ${tasksCreated}/${totalTasks} tasks created...`);
      }
    }

    this.log(`✓ Created ${tasksCreated} main tasks`);

    // Create subtasks (20-30% of root tasks will have 1-3 subtasks)
    const tasksWithSubtasks = Math.floor(rootTasks.length * 0.25);
    let subtasksCreated = 0;

    for (let i = 0; i < tasksWithSubtasks; i++) {
      const parentTask = rootTasks[i];
      const numSubtasks = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < numSubtasks; j++) {
        const subtaskAge = Math.random() * 3;
        const createdAt = new Date(parentTask.createdAt.getTime() + subtaskAge * 24 * 60 * 60 * 1000);

        const status = this.getRandomElement(this.existingStatuses);
        const priority = parentTask.priority || this.getRandomElement(this.existingPriorities);

        const subtaskTitle = this.getRandomElement(subtaskTitles);

        const dueDate = parentTask.dueDate
          ? new Date(Math.min(
            new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).getTime(),
            parentTask.dueDate.getTime()
          ))
          : new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);

        let completedAt = null;
        if (["Resolved", "Closed"].includes(status.name)) {
          completedAt = new Date(createdAt);
          completedAt.setDate(completedAt.getDate() + Math.floor(Math.random() * 5) + 1);
        }

        // Subtasks inherit parent assignee (mandatory)
        const assignee = parentTask.assigneeId;

        const subtask = await models.Task.create({
          title: subtaskTitle,
          description: null,
          ticketId: parentTask.ticketId,
          parentTaskId: parentTask.id,
          createdById: parentTask.createdById,
          assigneeId: assignee,
          statusId: status.id,
          priorityId: priority.id,
          dueDate,
          startDate: null,
          completedAt,
          position: j,
          createdAt,
          updatedAt: completedAt || createdAt,
        });

        this.createdTasks.push(subtask);
        subtasksCreated++;
      }
    }

    this.log(`✓ Created ${subtasksCreated} subtasks`);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async seed(): Promise<void> {
    console.log("🌱 Starting database seeding...\n");
    console.log("Options:", this.options, "\n");

    try {
      if (this.options.clean) {
        await this.cleanDatabase();
        console.log("");
      }

      await this.fetchExistingData();

      await this.createTags();

      await this.createUsers();
      await this.createRequesters();

      await this.createTickets();

      await this.createTasks();

      await this.createSystemNotifications();

      console.log("\n✅ Database seeding completed successfully!");
      console.log("\nSummary:");
      console.log(`  - ${this.existingStatuses.length} statuses (existing)`);
      console.log(`  - ${this.existingPriorities.length} priorities (existing)`);
      console.log(`  - ${this.existingCategories.length} categories (existing)`);
      console.log(`  - ${this.createdTags.length} tags`);
      console.log(`  - ${this.createdUsers.length} users`);
      console.log(`  - ${this.createdRequesters.length} requesters`);
      console.log(`  - ${this.createdTickets.length} tickets`);
      console.log(`  - ${this.createdTasks.length} tasks (including subtasks)`);
      console.log(`  - ${this.createdNotifications.length} notifications`);

    } catch (error) {
      console.error("\n❌ Error during seeding:");
      console.error(error);
      throw error;
    }
  }
}

function parseArgs(): SeederOptions {
  const args = process.argv.slice(2);
  const options: SeederOptions = {
    clean: args.includes('--clean'),
    realistic: args.includes('--realistic'),
    quick: args.includes('--quick'),
    verbose: !args.includes('--quiet'),
  };

  for (const arg of args) {
    const match = arg.match(/--(\w+)=(\d+)/);
    if (match) {
      const [, key, value] = match;
      (options as Record<string, unknown>)[key] = parseInt(value, 10);
    }
  }

  return options;
}

const options = parseArgs();
const seeder = new DatabaseSeeder(options);

seeder.seed()
  .then(() => {
    console.log("\n👋 Seeding complete. Exiting...");
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
