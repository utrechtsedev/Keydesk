import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getFileExtension, generateRandomString } from '$lib/utils/string';
import { getTicketPrefix, generateTicketNumber } from '$lib/server/ticket';
import { type Attachment } from '$lib/types';
import { MailParser } from "mailparser";
import { sanitize } from "./sanitize";
import { getClient } from "./client";
import { logger } from '$lib/server/logger';
import path from "path";
import fs from "fs";
import { sendNotification } from '$lib/server/job-queue';

const client = await getClient();

/**
 * Processes incoming email messages and creates corresponding tickets in the database.
 * 
 * This function iterates through unseen email UIDs, fetches their content, parses them,
 * extracts attachments, and creates or updates tickets with the email information.
 * It handles requester creation, ticket number generation, attachment validation,
 * and marks processed emails as seen.
 * 
 * @param unseenUIDs - Array of email UIDs to process from the IMAP server
 * @param options - Attachment configuration options including size limits and allowed types
 * @returns A promise that resolves when all messages have been processed
 * 
 * @throws {Error} Logs errors for individual message processing but continues with remaining messages
 * 
 * @example
 * ```typescript
 * const unseenUIDs = [123, 124, 125];
 * const attachmentConfig = {
 *   enabled: true,
 *   maxFileSizeMB: 10,
 *   allowedMimeTypes: ['image/png', 'application/pdf']
 * };
 * await processMessage(unseenUIDs, attachmentConfig);
 * ```
 * 
 * @remarks
 * - Validates email structure (source, envelope, sender, subject)
 * - Creates or finds existing requester by email address
 * - Matches tickets by ticket number in subject line or creates new ticket
 * - Validates attachments against size and MIME type restrictions
 * - Sanitizes HTML content before storing in database
 * - Marks emails as seen after successful processing
 * - Continues processing remaining emails even if one fails
 */
export async function processMessage(
  unseenUIDs: number[],
  options: Attachment,
): Promise<void> {

  for (const uid of unseenUIDs) {
    try {
      const message = await client.fetchOne(uid, {
        source: true,
        envelope: true,
      }, { uid: true });

      // Early validation checks
      if (!message) continue;
      if (!message.source) {
        logger.warn({ uid }, 'No source for UID, skipped');
        continue;
      }
      if (!message.envelope) {
        logger.warn({ uid }, 'No envelope for UID, skipped');
        continue;
      }

      const envelope = message.envelope;

      if (!envelope.from?.[0] || !envelope.from[0].address) {
        logger.warn({ uid }, 'No sender for UID, skipped');
        continue;
      }
      if (!envelope.subject) {
        envelope.subject = 'No Subject';
        logger.warn({ uid }, 'No subject for UID');
      }

      const from = envelope.from[0];
      const subject = envelope.subject;

      // Check if attachments are enabled
      const attachmentsEnabled = options.enabled !== false;

      // Database operations in transaction
      const result = await db.transaction(async (tx) => {

        // Find or create requester
        const [existingRequester] = await tx
          .select()
          .from(schema.requester)
          .where(eq(schema.requester.email, from.address!));

        let requester;
        let createdRequester = false;

        if (existingRequester) {
          requester = existingRequester;
        } else {
          const requesterValues: schema.NewRequester = {
            name: from.name,
            email: from.address!,
          };
          const [newRequester] = await tx
            .insert(schema.requester)
            .values(requesterValues)
            .returning();
          requester = newRequester;
          createdRequester = true;
        }

        // Extract ticket number from subject
        const prefix = await getTicketPrefix();
        const match = subject.match(new RegExp(`${prefix}(\\d+)`, 'i'));
        const ticketNumber = match ? match[0] : null;

        // Find or create ticket
        let ticket;
        let createdTicket = false;

        if (ticketNumber) {
          const [existingTicket] = await tx
            .select()
            .from(schema.ticket)
            .where(eq(schema.ticket.ticketNumber, ticketNumber));

          if (existingTicket) {
            ticket = existingTicket;
            
          }
        }

        if (!ticket) {
          const newTicketNumber = await generateTicketNumber(tx);
          const [newTicket] = await tx
            .insert(schema.ticket)
            .values({
              ticketNumber: newTicketNumber,
              requesterId: requester.id,
              assignedUserId: null,
              subject: subject || "No subject",
              channel: "email",
              statusId: 1,
              priorityId: 1,
              categoryId: 1,
              firstResponseAt: null,
              resolvedAt: null,
              closedAt: null,
              targetDate: new Date(),
              lastUserResponseAt: null,
              lastRequesterResponseAt: null,
              responseCount: 0,
            })
            .returning();
          ticket = newTicket;
          createdTicket = true;
        }

        return { requester, createdRequester, ticket, createdTicket };
      });

      const { requester, createdRequester, ticket, createdTicket } = result;

      // Parse email and collect data
      const { emailContent, attachmentData } = await new Promise<{
        emailContent: { html: string; text: string };
        attachmentData: Array<{
          fileId: string;
          storedFilename: string;
          originalFilename: string;
          filePath: string;
          size: number;
          mimeType: string;
        }>;
      }>((resolve, reject) => {
        const parser = new MailParser();

        let emailContent = { html: '', text: '' };
        let attachmentData: Array<{
          fileId: string;
          storedFilename: string;
          originalFilename: string;
          filePath: string;
          size: number;
          mimeType: string;
        }> = [];

        parser.on('data', (data) => {
          if (data.type === 'text') {
            if (data.text) {
              emailContent.text += data.text;
            }
            if (typeof data.html === 'string') {
              emailContent.html += data.html;
            }
          }

          if (data.type === 'attachment') {
            // Skip attachment processing if disabled
            if (!attachmentsEnabled) {
              logger.info({ filename: data.filename }, 'Attachments disabled, skipping');
              data.release();
              return;
            }

            const fileSize = data.size || 0;
            const mimeType = data.contentType || 'application/octet-stream';

            const maxSizeBytes = options.maxFileSizeMB! * 1024 * 1024;
            if (fileSize > maxSizeBytes) {
              logger.warn({
                filename: data.filename,
                fileSize,
                maxSizeBytes
              }, 'Attachment exceeds max size, skipping');
              data.release();
              return;
            }

            // Validate MIME type
            if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
              if (!options.allowedMimeTypes.includes(mimeType)) {
                logger.warn({
                  filename: data.filename,
                  mimeType
                }, 'Attachment has disallowed MIME type, skipping');
                data.release();
                return;
              }
            }

            const fileId = generateRandomString(24);
            const extension = getFileExtension(path.basename(data.filename));
            const storedFilename = extension ? `${fileId}.${extension}` : fileId;
            const filePath = path.join('./uploads', storedFilename);

            attachmentData.push({
              fileId,
              storedFilename,
              originalFilename: data.filename,
              filePath,
              size: fileSize,
              mimeType: mimeType
            });

            data.content.pipe(fs.createWriteStream(filePath));
            data.release();
          }
        });

        parser.on('end', () => {
          resolve({ emailContent, attachmentData });
        });

        parser.on('error', reject);

        parser.write(message.source);
        parser.end();
      });

      // Create ticket message and attachments
      const [ticketMessage] = await db
        .insert(schema.ticketMessage)
        .values({
          ticketId: ticket.id,
          senderType: "requester",
          requesterId: requester.id,
          senderName: requester.name || null,
          senderEmail: requester.email,
          userId: null,
          message: sanitize(emailContent.html, emailContent.text),
          isPrivate: false,
          channel: "email",
          isFirstResponse: false,
          hasAttachments: attachmentData.length > 0,
        })
        .returning();

      for (const attachment of attachmentData) {
        await db.insert(schema.ticketAttachment).values({
          ticketId: ticket.id,
          messageId: ticketMessage.id,
          fileName: attachment.storedFilename,
          originalFileName: attachment.originalFilename,
          filePath: attachment.filePath,
          fileSize: attachment.size,
          mimeType: attachment.mimeType,
          uploadedByType: "requester",
          uploadedById: requester.id,
          uploadedByName: requester.name || requester.email,
          downloadCount: 0,
        });
      }

      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      logger.info({ uid }, 'Marked UID as seen');

      // if this message is just an update to an existing ticket
      if (!createdTicket && ticket && ticket.assignedUserId) {
        await sendNotification({
          title: `Ticket Updated`,
          message: `New message from ${requester.name}`,
          recipient: { userId: ticket.assignedUserId },
          channels: ['dashboard', 'email'],
          notification: {
            type: 'entity',
            event: 'updated',
            entity: {
              type: 'ticket',
              id: ticket.id
            }
          }
        })
      } else if (createdTicket && ticket) {
        await sendNotification({
          title: `Ticket Created`,
          message: `Reported by ${requester.name}`,
          recipient: { allUsers: true },
          channels: ['dashboard', 'email'],
          notification: {
            type: 'entity',
            event: 'created',
            entity: {
              type: 'ticket',
              id: ticket.id
            }
          }
        });
      }

    } catch (error) {
      logger.error({ uid, error }, 'Error processing UID');
    }
  }
}
