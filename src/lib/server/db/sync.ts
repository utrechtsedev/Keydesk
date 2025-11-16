import { Command } from "commander";
import chalk from "chalk";
import ora, { type Ora } from "ora";
import { sequelize } from "./instance.js";
import "./models/index.js";
import { models } from "./models/index.js";

interface SyncOptions {
  force?: boolean;
  alter?: boolean;
  seedOnly?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

class DatabaseSync {
  private spinner: Ora = ora();

  private async seedConfigurations(): Promise<void> {
    this.spinner.start("Seeding configuration data...");

    const attachments = await models.Config.findOne({
      where: { key: "attachments" },
    });
    if (!attachments) {
      await models.Config.upsert({
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
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", //docx
            "application/vnd.ms-excel", // xls
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", //xlsx
            "text/*", // txt and  other text formats
            "application/zip",
          ],
        },
      });
      this.spinner.succeed("Attachments configuration created");
    } else {
      this.spinner.info("Attachments configuration already exists");
    }

    this.spinner.start("Setting up business hours...");
    const businessHours = await models.Config.findOne({
      where: { key: "businesshours" },
    });
    if (!businessHours) {
      await models.Config.upsert({
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
      this.spinner.succeed("Business hours configuration created");
    } else {
      this.spinner.info("Business hours configuration already exists");
    }

    this.spinner.start("Setting up priorities...");
    const priorities = await models.Priority.findAll();
    if (priorities.length < 1) {
      await models.Priority.bulkCreate([
        { id: 0, name: "Low", color: "#94A3B8", isDefault: false, order: 1 },
        { id: 1, name: "Medium", color: "#3B82F6", isDefault: true, order: 2, },
        { id: 2, name: "High", color: "#F59E0B", isDefault: false, order: 3 },
        { id: 3, name: "Urgent", color: "#EF4444", isDefault: false, order: 4 },
      ], {
        updateOnDuplicate: ['name', 'color', 'isDefault', 'order']
      }),
        this.spinner.succeed("Priorities configuration created");
    } else {
      this.spinner.info("Priorities configuration already exists");
    }

    this.spinner.start("Setting up statuses...");
    const statuses = await models.Status.findAll();
    if (statuses.length < 1) {
      await models.Status.bulkCreate([{
        id: 0,
        name: "New",
        color: "#3B82F6",
        isDefault: true,
        isClosed: false
      },
      {
        id: 1,
        name: "Open",
        color: "#10B981",
        isDefault: false,
        isClosed: false
      },
      {
        id: 2,
        name: "Pending",
        color: "#F59E0B",
        isDefault: false,
        isClosed: false
      },
      {
        id: 3,
        name: "On Hold",
        color: "#8B5CF6",
        isDefault: false,
        isClosed: false
      },
      {
        id: 4,
        name: "Resolved",
        color: "#059669",
        isDefault: false,
        isClosed: true
      },
      {
        id: 5,
        name: "Closed",
        color: "#6B7280",
        isDefault: false,
        isClosed: true
      }], {
        updateOnDuplicate: ['name', 'color', 'isDefault', 'isClosed']
      }),
        this.spinner.succeed("Statuses configuration created");
    } else {
      this.spinner.info("Statuses configuration already exists");
    }

    this.spinner.start("Setting up notifications...");
    const notifications = await models.Config.findOne({
      where: { key: "notifications" },
    });
    if (!notifications) {
      await models.Config.upsert({
        key: "notifications",
        value: {
          dashboard: {
            ticket: {
              created: {
                notifyAllUsers: true,
              },
              assigned: {
                notifyUser: true
              },
              updated: {
                notifyUser: true
              },
              resolved: {
                notifyUser: true
              },
              closed: {
                notifyUser: true
              }
            }
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
            }
          },
        },
      });
      this.spinner.succeed("Notifications configuration created");
    } else {
      this.spinner.info("Notifications configuration already exists");
    }
  }

  /**
   * Seed default categories
   */
  private async seedCategories(): Promise<void> {
    this.spinner.start("Seeding categories...");
    const categoriesCount = await models.Category.count();

    if (categoriesCount === 0) {
      await models.Category.bulkCreate([
        {
          id: 0,
          name: "Technical Issue",
          description: "Technical problems or bugs",
          prefix: "",
        },
        {
          id: 1,
          name: "Modification Request",
          description: "Requests for modification",
          prefix: "CH",
        },
        {
          id: 2,
          name: "Question",
          description: "General questions or how-to",
          prefix: "Q",
        },
        {
          id: 3,
          name: "Incident",
          description: "Service disruption or outage",
          prefix: "I",
        },
        {
          id: 4,
          name: "Other",
          description: "Miscellaneous requests",
          prefix: "O",
        },
      ],
        {
          updateOnDuplicate: ['name', 'description', 'prefix']
        });
      this.spinner.succeed("Categories seeded successfully");
    } else {
      this.spinner.info(`${categoriesCount} categories already exist`);
    }
  }

  /**
   * Sync database schema
   */
  private async syncSchema(options: SyncOptions): Promise<void> {
    if (options.force) {
      this.spinner.warn("Force mode: This will DROP all tables!");
      this.spinner.start("Dropping and recreating tables...");
      await sequelize.sync({ force: true });
      this.spinner.succeed("Tables recreated");
    } else if (options.alter) {
      this.spinner.start("Altering tables to match models...");
      await sequelize.sync({ alter: true });
      this.spinner.succeed("Tables altered successfully");
    } else {
      this.spinner.start("Creating tables if they don't exist...");
      await sequelize.sync();
      this.spinner.succeed("Tables synchronized");
    }
  }

  /**
   * Main sync function
   */
  async sync(options: SyncOptions): Promise<void> {
    try {
      console.log(chalk.blue.bold("\nDatabase Synchronization Tool\n"));

      if (options.dryRun) {
        console.log(chalk.yellow("DRY RUN MODE - No changes will be made\n"));
      }

      this.spinner.start("Testing database connection...");
      await sequelize.authenticate();
      this.spinner.succeed("Database connection established");

      if (options.dryRun) {
        console.log(
          chalk.cyan("\nWould perform the following operations:")
        );
        if (!options.seedOnly) {
          console.log(
            chalk.gray(
              options.force
                ? "  - Drop and recreate all tables"
                : options.alter
                  ? "  - Alter tables to match models"
                  : "  - Create tables if they don't exist"
            )
          );
        }
        console.log(chalk.gray("  - Seed configuration data"));
        console.log(chalk.gray("  - Seed default categories"));
        console.log(chalk.yellow("\n✓ Dry run complete\n"));
        return;
      }

      if (!options.seedOnly) {
        await this.syncSchema(options);
      }

      console.log();
      await this.seedConfigurations();
      await this.seedCategories();

      console.log(chalk.green.bold("\n✓ Database synchronization completed successfully!\n"));
    } catch (error) {
      this.spinner.fail("Synchronization failed");
      console.error(chalk.red("\nError:"), error);
      throw error;
    } finally {
      await sequelize.close();
      if (options.verbose) {
        console.log(chalk.gray("Database connection closed"));
      }
    }
  }

  /**
   * First-time setup: force sync + seed all data
   */
  async firstTimeSetup(options: {
    force?: boolean;
    alter?: boolean;
    verbose?: boolean;
    dryRun?: boolean
  }): Promise<void> {
    console.log(chalk.magenta.bold("\nFirst-Time Database Setup\n"));
    console.log(
      chalk.yellow(
        "This will create all tables and seed initial data.\n"
      )
    );

    await this.sync({
      force: options.force || false,
      alter: options.alter || false,
      seedOnly: false,
      verbose: options.verbose,
      dryRun: options.dryRun,
    });
  }

  /**
   * Update schema only (no seeding)
   */
  async updateSchema(options: {
    force?: boolean;
    alter?: boolean;
    verbose?: boolean;
    dryRun?: boolean;
  }): Promise<void> {
    console.log(chalk.cyan.bold("\nSchema Update\n"));

    try {
      if (options.dryRun) {
        console.log(chalk.yellow("DRY RUN MODE - No changes will be made\n"));
        console.log(chalk.cyan("Would perform:"));
        console.log(
          chalk.gray(
            options.force
              ? "  - Drop and recreate all tables"
              : options.alter
                ? "  - Alter tables to match models"
                : "  - Create missing tables"
          )
        );
        console.log(chalk.yellow("\n✓ Dry run complete\n"));
        return;
      }

      this.spinner.start("Testing database connection...");
      await sequelize.authenticate();
      this.spinner.succeed("Database connection established");

      await this.syncSchema({
        force: options.force,
        alter: options.alter,
      });

      console.log(chalk.green.bold("\n✓ Schema update completed!\n"));
    } catch (error) {
      this.spinner.fail("Schema update failed");
      console.error(chalk.red("\nError:"), error);
      throw error;
    } finally {
      await sequelize.close();
    }
  }

  /**
   * Seed data only (assumes tables exist)
   */
  async seedOnly(options: { verbose?: boolean; dryRun?: boolean }): Promise<void> {
    console.log(chalk.green.bold("\nSeeding Data\n"));

    await this.sync({
      seedOnly: true,
      verbose: options.verbose,
      dryRun: options.dryRun,
    });
  }
}

const program = new Command();
const dbSync = new DatabaseSync();

program
  .name("db-sync")
  .description("Modern CLI tool for database synchronization and management")
  .version("1.0.0");

program
  .command("setup")
  .description("First-time database setup (create tables and seed data)")
  .option("-f, --force", "Drop and recreate all tables (DESTRUCTIVE!)")
  .option("-a, --alter", "Alter tables to match models")
  .option("-d, --dry-run", "Show what would be done without making changes")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    try {
      await dbSync.firstTimeSetup(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command("sync")
  .description("Synchronize database (schema + data)")
  .option("-f, --force", "Drop and recreate all tables (DESTRUCTIVE!)")
  .option("-a, --alter", "Alter tables to match models")
  .option("-d, --dry-run", "Show what would be done without making changes")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    try {
      await dbSync.sync(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command("schema")
  .description("Update database schema only (no data seeding)")
  .option("-f, --force", "Drop and recreate all tables (DESTRUCTIVE!)")
  .option("-a, --alter", "Alter tables to match models")
  .option("-d, --dry-run", "Show what would be done without making changes")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    try {
      await dbSync.updateSchema(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command("seed")
  .description("Seed initial data only (assumes tables exist)")
  .option("-d, --dry-run", "Show what would be done without making changes")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    try {
      await dbSync.seedOnly(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

program.parse();
