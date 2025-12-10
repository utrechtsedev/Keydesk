import { db } from "./database.js";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index.js";

/**
 * Initialize Database with Default Configuration
 * 
 * This script sets up:
 * - Config settings (attachments, business hours, notifications)
 * - Priorities
 * - Statuses  
 * - Categories
 * 
 * Run this FIRST before any other seeding scripts.
 * 
 * Usage: tsx init-database.ts
 */

class DatabaseInitializer {
  private log(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const icons = {
      info: 'ℹ️',
      success: '✓',
      warn: '⚠️',
      error: '✗'
    };
    console.log(`${icons[type]} ${message}`);
  }

  async initialize(): Promise<void> {
    console.log("🚀 Initializing database with default configuration...\n");

    try {
      await this.setupAttachmentsConfig();
      await this.setupBusinessHoursConfig();
      await this.setupNotificationsConfig();
      await this.setupPriorities();
      await this.setupStatuses();
      await this.setupCategories();

      console.log("\n✅ Database initialization completed successfully!");
      console.log("\nNext steps:");
      console.log("  1. Run: tsx seed-database.ts --clean");
      console.log("  2. Or use the complete seeder if you created it");

    } catch (error) {
      console.error("\n❌ Error during initialization:");
      console.error(error);
      throw error;
    }
  }

  private async setupAttachmentsConfig(): Promise<void> {
    this.log("Setting up attachments configuration...", 'info');

    try {
      const [existing] = await db
        .select()
        .from(schema.config)
        .where(sql`${schema.config.key} = 'attachments'`);

      if (!existing) {
        await db.insert(schema.config).values({
          key: "attachments",
          value: {
            enabled: true,
            maxFileSizeMB: 10,
            allowedMimeTypes: [
              "image/jpg",
              "image/jpeg",
              "image/png",
              "image/gif",
              "application/pdf",
              "application/msword", // doc
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
              "application/vnd.ms-excel", // xls
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
              "text/*", // txt and other text formats
              "application/zip",
            ],
          },
        });
        this.log("Attachments configuration created", 'success');
      } else {
        this.log("Attachments configuration already exists", 'info');
      }
    } catch (error) {
      this.log("Failed to setup attachments configuration", 'error');
      throw error;
    }
  }

  private async setupBusinessHoursConfig(): Promise<void> {
    this.log("Setting up business hours...", 'info');

    try {
      const [existing] = await db
        .select()
        .from(schema.config)
        .where(sql`${schema.config.key} = 'businesshours'`);

      if (!existing) {
        await db.insert(schema.config).values({
          key: "businesshours",
          value: {
            schedule: {
              monday: { enabled: true, start: "09:00", end: "17:00" },
              tuesday: { enabled: true, start: "09:00", end: "17:00" },
              wednesday: { enabled: true, start: "09:00", end: "17:00" },
              thursday: { enabled: true, start: "09:00", end: "17:00" },
              friday: { enabled: true, start: "09:00", end: "17:00" },
              saturday: { enabled: false, start: null, end: null },
              sunday: { enabled: false, start: null, end: null },
            },
          },
        });
        this.log("Business hours configuration created", 'success');
      } else {
        this.log("Business hours configuration already exists", 'info');
      }
    } catch (error) {
      this.log("Failed to setup business hours configuration", 'error');
      throw error;
    }
  }

  private async setupNotificationsConfig(): Promise<void> {
    this.log("Setting up notifications...", 'info');

    try {
      const [existing] = await db
        .select()
        .from(schema.config)
        .where(sql`${schema.config.key} = 'notifications'`);

      if (!existing) {
        await db.insert(schema.config).values({
          key: "notifications",
          value: {
            dashboard: {
              ticket: {
                created: {
                  notifyAllUsers: true,
                },
                assigned: {
                  notifyUser: true,
                },
                updated: {
                  notifyUser: true,
                },
                resolved: {
                  notifyUser: true,
                },
                closed: {
                  notifyUser: true,
                },
              },
            },
            email: {
              ticket: {
                created: {
                  notifyAllUsers: true,
                  notifyRequester: true,
                },
                assigned: {
                  notifyUser: true,
                  notifyRequester: true,
                },
                updated: {
                  notifyUser: true,
                  notifyRequester: true,
                },
                resolved: {
                  notifyUser: true,
                  notifyRequester: true,
                },
                closed: {
                  notifyUser: true,
                  notifyRequester: false,
                },
              },
            },
          },
        });
        this.log("Notifications configuration created", 'success');
      } else {
        this.log("Notifications configuration already exists", 'info');
      }
    } catch (error) {
      this.log("Failed to setup notifications configuration", 'error');
      throw error;
    }
  }

  private async setupPriorities(): Promise<void> {
    this.log("Setting up priorities...", 'info');

    try {
      const existing = await db.select().from(schema.priority);

      if (existing.length === 0) {
        const priorities = [
          { name: "Low", color: "#94A3B8", isDefault: false, order: 1 },
          { name: "Medium", color: "#3B82F6", isDefault: true, order: 2 },
          { name: "High", color: "#F59E0B", isDefault: false, order: 3 },
          { name: "Urgent", color: "#EF4444", isDefault: false, order: 4 },
        ];

        for (const priority of priorities) {
          await db.insert(schema.priority).values(priority);
        }

        this.log(`Priorities created (${priorities.length} total)`, 'success');
      } else {
        this.log(`Priorities already exist (${existing.length} found)`, 'info');
      }
    } catch (error) {
      this.log("Failed to setup priorities", 'error');
      throw error;
    }
  }

  private async setupStatuses(): Promise<void> {
    this.log("Setting up statuses...", 'info');

    try {
      const existing = await db.select().from(schema.status);

      if (existing.length === 0) {
        const statuses = [
          { name: "New", color: "#3B82F6", isDefault: true, isClosed: false },
          { name: "Open", color: "#10B981", isDefault: false, isClosed: false },
          { name: "Pending", color: "#F59E0B", isDefault: false, isClosed: false },
          { name: "On Hold", color: "#8B5CF6", isDefault: false, isClosed: false },
          { name: "Resolved", color: "#059669", isDefault: false, isClosed: true },
          { name: "Closed", color: "#6B7280", isDefault: false, isClosed: true },
        ];

        for (const status of statuses) {
          await db.insert(schema.status).values(status);
        }

        this.log(`Statuses created (${statuses.length} total)`, 'success');
      } else {
        this.log(`Statuses already exist (${existing.length} found)`, 'info');
      }
    } catch (error) {
      this.log("Failed to setup statuses", 'error');
      throw error;
    }
  }

  private async setupCategories(): Promise<void> {
    this.log("Seeding categories...", 'info');

    try {
      const existing = await db.select().from(schema.category);

      if (existing.length === 0) {
        const categories = [
          {
            name: "Technical Issue",
            description: "Technical problems or bugs",
            prefix: "",
          },
          {
            name: "Modification Request",
            description: "Requests for modification",
            prefix: "CH",
          },
          {
            name: "Question",
            description: "General questions or how-to",
            prefix: "Q",
          },
          {
            name: "Incident",
            description: "Service disruption or outage",
            prefix: "I",
          },
          {
            name: "Other",
            description: "Miscellaneous requests",
            prefix: "O",
          },
        ];

        for (const category of categories) {
          await db.insert(schema.category).values(category);
        }

        this.log(`Categories created (${categories.length} total)`, 'success');
      } else {
        this.log(`Categories already exist (${existing.length} found)`, 'info');
      }
    } catch (error) {
      this.log("Failed to setup categories", 'error');
      throw error;
    }
  }
}

// Run the initializer
const initializer = new DatabaseInitializer();

initializer.initialize()
  .then(() => {
    console.log("\n👋 Initialization complete. Exiting...");
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
