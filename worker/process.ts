import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { getFileExtension, generateRandomString } from '$lib/utils/string';
import { type Attachment } from '$lib/types';
import { MailParser } from 'mailparser';
import { sanitize } from './sanitize';
import { getClient } from './client';
import { logger } from '$lib/server/logger';
import path from 'path';
import fs from 'fs';
import { archiveEmail, markEmailFailed, updateArchivedEmail } from './archive';
import { ticketService } from '$lib/server/services/ticket.service';

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
export async function processMessage(unseenUIDs: number[], options: Attachment): Promise<void> {
	const [openStatus] = await db
		.select()
		.from(schema.status)
		.where(eq(schema.status.isDefault, true));
	if (!openStatus)
		throw new Error('Status configuration is not available. Cancelling all email processing');

	for (const uid of unseenUIDs) {
		let archivedEmail: schema.Email | null = null;

		try {
			const message = await client.fetchOne(
				uid,
				{
					source: true,
					envelope: true,
					size: true
				},
				{ uid: true }
			);

			// Early validation checks
			if (!message) continue;
			if (!message.source) {
				logger.warn({ uid }, 'No source for UID, skipped');
				await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
				continue;
			}
			if (!message.envelope) {
				logger.warn({ uid }, 'No envelope for UID, skipped');
				await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
				continue;
			}

			if (!message.envelope.from?.[0] || !message.envelope.from[0].address) {
				logger.warn({ uid }, 'No sender for UID, skipped');
				await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
				continue;
			}
			if (!message.envelope.subject) {
				message.envelope.subject = 'No Subject';
			}

			// Check if attachments are enabled
			const attachmentsEnabled = options.enabled !== false;

			// Database operations in transaction
			const result = await db.transaction(async (tx) => {
				// Find or create requester
				const [requester] =
					(await tx
						.select()
						.from(schema.requester)
						.where(eq(schema.requester.email, message.envelope!.from![0].address!))) ??
					(await tx
						.insert(schema.requester)
						.values({
							name: message.envelope!.from![0].name || message.envelope!.from![0].address!,
							email: message.envelope!.from![0].address!
						})
						.returning());

				// Extract ticket number from subject
				const prefix = await ticketService.getTicketPrefix();
				const match = message.envelope!.subject!.match(new RegExp(`${prefix}(\\d+)`, 'i'));
				const ticketNumber = match ? parseInt(match[1], 10) : null;

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
					const [newTicket] = await tx
						.insert(schema.ticket)
						.values({
							requesterId: requester.id,
							assigneeId: null,
							subject: message.envelope!.subject!,
							channel: 'email',
							statusId: openStatus.id,
							priorityId: 1,
							firstResponseAt: null,
							resolvedAt: null,
							closedAt: null,
							targetDate: new Date(),
							lastUserResponseAt: null,
							lastRequesterResponseAt: null,
							responseCount: 0
						})
						.returning();
					ticket = newTicket;
					createdTicket = true;
				}

				return { requester, ticket, createdTicket };
			});

			const { requester, ticket, createdTicket } = result;

			// Parse email and collect data
			const { emailContent, attachmentData } = await parseEmailContent(
				message.source,
				attachmentsEnabled,
				options
			);

			archivedEmail = await archiveEmail({
				uid,
				source: message.source,
				envelope: message.envelope,
				parsedEmail: emailContent,
				metadata: {
					size: message.source.length,
					hasAttachments: attachmentData.length > 0
				}
			});

			const rateLimitCheck = await checkRateLimit(message.envelope.from[0].address);
			if (rateLimitCheck.isRateLimited) {
				logger.warn(
					{
						uid,
						address: message.envelope.from[0].address,
						reason: rateLimitCheck.reason
					},
					'Email rate limited, skipping ticket creation'
				);

				// Mark archived email as failed due to rate limit
				await markEmailFailed(archivedEmail.id, rateLimitCheck.reason!);

				// Mark as seen and skip to next email
				await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
				continue;
			}
			// Create ticket message and attachments
			const [ticketMessage] = await db
				.insert(schema.ticketMessage)
				.values({
					ticketId: ticket.id,
					senderType: 'requester',
					requesterId: requester.id,
					senderName: requester.name || null,
					senderEmail: requester.email,
					userId: null,
					message: sanitize(emailContent.html, emailContent.text),
					isPrivate: false,
					channel: 'email',
					isFirstResponse: false,
					hasAttachments: attachmentData.length > 0
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
					uploadedByType: 'requester',
					uploadedById: requester.id,
					uploadedByName: requester.name || requester.email,
					downloadCount: 0
				});
			}

			await updateArchivedEmail({
				emailId: archivedEmail.id,
				ticketId: ticket.id,
				requesterId: requester.id,
				messageId: ticketMessage.id,
				processed: true
			});

			await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
			logger.info({ uid }, 'Marked UID as seen');
		} catch (error) {
			if (archivedEmail) {
				await markEmailFailed(archivedEmail.id, error);
			}
			logger.error({ uid, error }, 'Error processing UID');
		}
	}
}

/**
 * Parses email content and extracts attachments
 */
async function parseEmailContent(
	source: Buffer,
	attachmentsEnabled: boolean,
	options: Attachment
): Promise<{
	emailContent: { html: string; text: string };
	attachmentData: Array<{
		fileId: string;
		storedFilename: string;
		originalFilename: string;
		filePath: string;
		size: number;
		mimeType: string;
	}>;
}> {
	return new Promise((resolve, reject) => {
		const parser = new MailParser();

		const emailContent = { html: '', text: '' };
		const attachmentData: Array<{
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
					logger.warn(
						{
							filename: data.filename,
							fileSize,
							maxSizeBytes
						},
						'Attachment exceeds max size, skipping'
					);
					data.release();
					return;
				}

				// Validate MIME type
				if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
					if (!options.allowedMimeTypes.includes(mimeType)) {
						logger.warn(
							{
								filename: data.filename,
								mimeType
							},
							'Attachment has disallowed MIME type, skipping'
						);
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

		parser.write(source);
		parser.end();
	});
}

/**
 * Checks if a sender has exceeded rate limits
 * @returns Object with isRateLimited boolean and reason string
 */
async function checkRateLimit(fromAddress: string): Promise<{
	isRateLimited: boolean;
	reason?: string;
}> {
	const now = new Date();
	const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

	// Check 10-minute limit (max 2 emails)
	const [recentEmails] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.email)
		.where(
			and(eq(schema.email.fromAddress, fromAddress), gte(schema.email.createdAt, tenMinutesAgo))
		);

	if (recentEmails.count >= 2) {
		return {
			isRateLimited: true,
			reason: `Rate limit exceeded: ${recentEmails.count} emails in last 10 minutes (max 2)`
		};
	}

	// Check 1-hour limit (max 5 emails)
	const [hourlyEmails] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.email)
		.where(and(eq(schema.email.fromAddress, fromAddress), gte(schema.email.createdAt, oneHourAgo)));

	if (hourlyEmails.count >= 5) {
		return {
			isRateLimited: true,
			reason: `Rate limit exceeded: ${hourlyEmails.count} emails in last hour (max 5)`
		};
	}

	return { isRateLimited: false };
}
