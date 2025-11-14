import { Requester, Ticket, TicketAttachment, TicketMessage } from '../src/lib/server/db/models'
import { getFileExtension, generateRandomString } from '../src/lib/utils/string'
import { getTicketPrefix, generateTicketNumber } from '../src/lib/server/ticket'
import { type Attachment } from '../src/lib/types'
import { MailParser } from "mailparser";
import { sanitize } from "./sanitize";
import { getClient } from "./client";
import path from "path";
import fs from "fs"
import { getLogTimestamp } from '../src/lib/utils/date';
const client = await getClient()

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
        console.warn(`No source for UID ${uid}, skipped.`);
        continue;
      }
      if (!message.envelope) {
        console.warn(`No envelope for UID ${uid}, skipped.`);
        continue;
      }

      const envelope = message.envelope;

      if (!envelope.from?.[0]) {
        console.warn(`No sender for UID ${uid}, skipped.`);
        continue;
      }
      if (!envelope.subject) {
        envelope.subject = 'No Subject'
        console.warn(`No subject for UID ${uid}.`);
      }

      const from = envelope.from[0];
      const subject = envelope.subject;

      if (!from.address) {
        console.warn(`No sender address for UID ${uid}, skipped.`);
        continue;
      }

      // Check if attachments are enabled
      const attachmentsEnabled = options.enabled !== false

      // Database operations before parsing
      const [requester, createdRequester] = await Requester.findOrCreate({
        where: {
          email: from.address
        },
        defaults: {
          name: from.name || null,
          email: from.address,
        }
      })

      const prefix = getTicketPrefix();
      const match = subject.match(new RegExp(`${prefix}(\\d+)`, 'i'));
      const ticketNumber = match ? match[0] : null

      let [ticket, createdTicket] = await Ticket.findOrCreate({
        where: { ticketNumber },
        defaults: {
          ticketNumber: await generateTicketNumber(),
          requesterId: requester.id,
          assignedUserId: null,
          subject: subject,
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
        }
      })

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
              console.log('Attachments disabled, skipping:', data.filename);
              data.release();
              return;
            }

            const fileSize = data.size || 0;
            const mimeType = data.contentType || 'application/octet-stream';

            const maxSizeBytes = options.maxFileSizeMB * 1024 * 1024;
            if (fileSize > maxSizeBytes) {
              console.warn(`Attachment ${data.filename} exceeds max size (${fileSize} > ${maxSizeBytes} bytes), skipping`);
              data.release();
              return;
            }

            // Validate MIME type
            if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
              if (!options.allowedMimeTypes.includes(mimeType)) {
                console.warn(`Attachment ${data.filename} has disallowed MIME type (${mimeType}), skipping`);
                data.release();
                return;
              }
            }

            console.log('Attachment found and validated:', {
              filename: data.filename,
              contentType: mimeType,
              size: fileSize
            });

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

      const ticketMessage = await TicketMessage.create({
        ticketId: ticket.id,
        senderType: "requester",
        requester: requester.id,
        senderName: requester.name || null,
        senderEmail: requester.email,
        userId: null,
        message: sanitize(emailContent.html, emailContent.text),
        isPrivate: false,
        channel: "email",
        isFirstResponse: false,
        hasAttachments: attachmentData.length > 0,
      })

      for (const attachment of attachmentData) {
        await TicketAttachment.create({
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
      console.log(`[${getLogTimestamp()}] Marked UID ${uid} as seen`);

    } catch (error) {
      console.error(`Error processing UID ${uid}:`, error);
    }
  }
}
