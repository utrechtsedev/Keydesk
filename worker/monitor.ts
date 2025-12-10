import { type Attachment } from '../src/lib/types'
import { db } from '../src/lib/server/db/database'
import * as schema from '../src/lib/server/db/schema'
import { eq } from 'drizzle-orm'
import { getLogTimestamp } from '../src/lib/utils/date.ts'
import { getClient } from './client';
import { processMessage } from './process.ts'
import fs from "fs"

const client = await getClient()

/** Maximum number of consecutive IDLE failures before switching to polling mode */
const MAX_IDLE_RETRIES = 3;

/** Initial delay in milliseconds before retrying IDLE connection */
const IDLE_RETRY_DELAY_MS = 5000; // Start with 5 seconds

/** Interval in milliseconds between polling checks when in fallback mode */
const POLLING_INTERVAL_MS = 60000; // Poll every 60 seconds as fallback

/**
 * Starts continuous email monitoring service with automatic retry and fallback mechanisms.
 * 
 * This is the main entry point for the email monitoring system. It continuously monitors
 * an IMAP inbox for new emails, processing them as they arrive. The function implements
 * resilient connection handling with automatic retry logic and falls back to polling mode
 * if IDLE mode fails repeatedly.
 * 
 * @returns A promise that runs indefinitely (never resolves under normal operation)
 * 
 * @throws {Error} Logs errors but continues running, implementing automatic recovery
 * 
 * @example
 * ```typescript
 * // Start the email monitoring service
 * startEmailMonitoring().catch(console.error);
 * ```
 * 
 * @remarks
 * **Connection Strategy:**
 * - Attempts IDLE mode (push notifications) by default for real-time email delivery
 * - Falls back to polling mode after 3 consecutive IDLE failures
 * - Uses exponential backoff (5s, 10s, 20s) for IDLE retries
 * - Polls every 60 seconds in fallback mode
 * 
 * **Workflow:**
 * 1. Ensures IMAP connection is established
 * 2. Creates upload directory if missing
 * 3. Loads attachment configuration from database
 * 4. Processes existing unread emails
 * 5. Sets up real-time notification handler
 * 6. Enters IDLE or polling loop
 * 
 * **Error Handling:**
 * - Automatically reconnects on connection failures
 * - Gracefully handles IMAP errors without stopping the service
 * - Switches to polling if IDLE is unsupported or unreliable
 * 
 * @see {@link ensureConnection} for connection management
 * @see {@link idleLoop} for real-time monitoring
 * @see {@link pollingLoop} for fallback monitoring
 */
export async function startEmailMonitoring(): Promise<void> {
  let idleRetries = 0;
  let usePolling = false;

  while (true) {
    try {
      // Ensure connection and mailbox are open
      await ensureConnection();

      // Create upload directory
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Get attachment config
      const mailOptions = await getMailOptions();

      // Process existing unread emails
      await processExistingUnread(mailOptions);

      // Set up exists handler
      setupExistsHandler(mailOptions);

      if (usePolling) {
        // Fallback: Use polling instead of IDLE
        console.log(`[${getLogTimestamp()}] Using polling mode (checking every 60 seconds)`);
        await pollingLoop(mailOptions);
      } else {
        // Try IDLE mode
        await idleLoop();
      }

    } catch (error) {
      console.error('IMAP Error:', error);

      // Increment retry counter
      idleRetries++;

      if (idleRetries >= MAX_IDLE_RETRIES) {
        console.warn(`[${getLogTimestamp()}] IDLE failed ${MAX_IDLE_RETRIES} times, switching to polling mode`);
        usePolling = true;
        idleRetries = 0; // Reset for potential future IDLE attempts
      } else {
        // Exponential backoff
        const delay = IDLE_RETRY_DELAY_MS * Math.pow(2, idleRetries - 1);
        console.log(`[${getLogTimestamp()}] Retrying in ${delay}ms... (attempt ${idleRetries}/${MAX_IDLE_RETRIES})`);
        await sleep(delay);
      }

      // Try to close and cleanup before retry
      try {
        client.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
}

/**
 * Ensures IMAP client is connected and INBOX mailbox is open.
 * 
 * Checks if the client is already connected and reuses the connection if available.
 * Otherwise, establishes a new connection and opens the INBOX mailbox for monitoring.
 * 
 * @returns A promise that resolves when connection and mailbox are ready
 * @throws {Error} If connection or mailbox opening fails
 * 
 * @remarks
 * - Checks `client.usable` to avoid unnecessary reconnections
 * - Always ensures INBOX is open before returning
 * - Logs connection status with timestamps
 */
async function ensureConnection(): Promise<void> {
  try {
    // Check if already connected
    const isConnected = client.usable;

    if (!isConnected) {
      console.log(`[${getLogTimestamp()}] Reconnecting to IMAP server...`);
      await client.connect();
    }

    // Ensure mailbox is open
    await client.mailboxOpen('INBOX');
    console.log(`[${getLogTimestamp()}] Succesfully connected to IMAP server.`)
  } catch (error) {
    console.error(`[${getLogTimestamp()}] Failed to establish connection:`, error);
    throw error;
  }
}

/**
 * Retrieves attachment configuration settings from the database.
 * 
 * Loads attachment handling configuration including enabled status, size limits,
 * and allowed MIME types. Returns safe defaults if configuration is missing or invalid.
 * 
 * @returns A promise resolving to attachment configuration options
 * 
 * @example
 * ```typescript
 * const config = await getMailOptions();
 * console.log(config.maxFileSizeMB); // 10
 * console.log(config.allowedMimeTypes); // ['image/png', 'application/pdf']
 * ```
 * 
 * @remarks
 * **Default Values:**
 * - `enabled: false` (if config invalid/missing)
 * - `maxFileSizeMB: 10`
 * - `allowedMimeTypes: []`
 * 
 * **Validation:**
 * - Checks if `allowedMimeTypes` is a non-empty array
 * - Disables attachments if configuration is invalid
 * - Logs warnings for missing or invalid configurations
 */
async function getMailOptions(): Promise<Attachment> {
  try {
    const [attachmentConfig] = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'attachments'));

    const config = attachmentConfig?.value as Attachment | undefined;

    if (!config?.allowedMimeTypes || !Array.isArray(config.allowedMimeTypes) || config.allowedMimeTypes.length === 0) {
      console.warn(`[${getLogTimestamp()}] Invalid or missing attachment config, attachments will be disabled`);
      return {
        enabled: false,
        maxFileSizeMB: 10,
        allowedMimeTypes: []
      };
    }

    return {
      enabled: config.enabled !== false,
      maxFileSizeMB: config.maxFileSizeMB || 10,
      allowedMimeTypes: config.allowedMimeTypes
    };
  } catch (error) {
    console.error(`[${getLogTimestamp()}] Error loading attachment config:`, error);
    return {
      enabled: false,
      maxFileSizeMB: 10,
      allowedMimeTypes: []
    };
  }
}

/**
 * Processes all existing unread emails in the mailbox.
 * 
 * Searches for unread messages and processes them immediately upon service startup.
 * This ensures no emails are missed during service downtime.
 * 
 * @param mailOptions - Attachment configuration for processing emails
 * @returns A promise that resolves when all existing unread emails are processed
 * 
 * @remarks
 * - Called once during startup before entering monitoring loop
 * - Does not throw on failure to avoid preventing service startup
 * - Logs the count of unread messages found
 */
async function processExistingUnread(mailOptions: Attachment): Promise<void> {
  try {
    const existingUnseenUIDs = await client.search({ seen: false }, { uid: true });
    if (existingUnseenUIDs && existingUnseenUIDs.length > 0) {
      console.log(`[${getLogTimestamp()}] Processing ${existingUnseenUIDs.length} existing unread messages`);
      await processMessage(existingUnseenUIDs, mailOptions);
    }
  } catch (error) {
    console.error(`[${getLogTimestamp()}] Error processing existing unread messages:`, error);
    // Don't throw - we can continue even if this fails
  }
}

/**
 * Sets up event handler for new email arrival notifications.
 * 
 * Configures the IMAP client to listen for 'exists' events (new messages) and
 * automatically processes unread emails when they arrive.
 * 
 * @param mailOptions - Attachment configuration for processing new emails
 * 
 * @remarks
 * - Removes existing listeners to prevent duplicate processing
 * - Triggered by IMAP server when new emails arrive
 * - Only processes unread messages (ignores seen emails)
 * - Handles errors gracefully without crashing the service
 */
function setupExistsHandler(mailOptions: Attachment): void {
  // Remove existing listeners to avoid duplicates
  client.removeAllListeners('exists');

  client.on('exists', async () => {
    try {
      const unseenUIDs = await client.search({ seen: false }, { uid: true });
      if (!unseenUIDs || unseenUIDs.length === 0) return;

      console.log(`[${getLogTimestamp()}] New message(s) detected: ${unseenUIDs.length} unread`);
      await processMessage(unseenUIDs, mailOptions);
    } catch (error) {
      console.error(`[${getLogTimestamp()}] Error handling new message:`, error);
    }
  });
}

/**
 * Enters IDLE mode for real-time email push notifications.
 * 
 * Uses IMAP IDLE command to keep connection alive and receive instant notifications
 * when new emails arrive. This is the preferred monitoring mode for efficiency.
 * 
 * @returns A promise that runs indefinitely in IDLE mode
 * 
 * @remarks
 * - Most efficient monitoring mode (no polling overhead)
 * - Server pushes notifications when emails arrive
 * - May fail if IMAP server doesn't support IDLE
 * - Falls back to polling mode after consecutive failures
 */
async function idleLoop(): Promise<void> {
  console.log(`[${getLogTimestamp()}] Starting IDLE mode...`);
  while (true) {
    await client.idle();
  }
}

/**
 * Enters polling mode as a fallback for email monitoring.
 * 
 * Periodically checks for new unread emails when IDLE mode is unavailable or unreliable.
 * Polls every 60 seconds and processes any unread messages found.
 * 
 * @param mailOptions - Attachment configuration for processing emails
 * @returns A promise that runs indefinitely in polling mode
 * 
 * @remarks
 * - Fallback mode when IDLE is unsupported or fails repeatedly
 * - Less efficient than IDLE (uses more resources)
 * - Polls at {@link POLLING_INTERVAL_MS} intervals (60 seconds)
 * - Automatically reconnects on errors
 */
async function pollingLoop(mailOptions: Attachment): Promise<void> {
  while (true) {
    try {
      await sleep(POLLING_INTERVAL_MS);

      // Check for new messages
      const unseenUIDs = await client.search({ seen: false }, { uid: true });
      if (unseenUIDs && unseenUIDs.length > 0) {
        console.log(`[${getLogTimestamp()}] Polling: Found ${unseenUIDs.length} unread messages`);
        await processMessage(unseenUIDs, mailOptions);
      }
    } catch (error) {
      console.error('Error during polling:', error);
      // Reconnect and continue
      await ensureConnection();
    }
  }
}

/**
 * Utility function to pause execution for a specified duration.
 * 
 * @param ms - Number of milliseconds to sleep
 * @returns A promise that resolves after the specified delay
 * 
 * @example
 * ```typescript
 * console.log('Starting...');
 * await sleep(5000);
 * console.log('5 seconds later');
 * ```
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
