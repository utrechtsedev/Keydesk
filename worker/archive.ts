import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

interface ArchiveEmailParams {
  uid: number;
  source: Buffer | string;
  envelope: {
    from?: Array<{ name?: string; address?: string }>;
    subject?: string;
    date?: Date;
  };
  parsedEmail?: {
    text?: string;
    html?: string;
  };
  metadata?: {
    size?: number;
    hasAttachments?: boolean;
  };
}

interface UpdateArchiveParams {
  emailId: number;
  ticketId?: number;
  requesterId?: number;
  messageId?: number;
  processed?: boolean;
  processingError?: string;
}

/**
 * Archives an incoming email to the database for record-keeping
 * Call this early in your processing pipeline to ensure emails are saved even if processing fails
 */
export async function archiveEmail(params: ArchiveEmailParams) {
  const { uid, source, envelope, parsedEmail, metadata } = params;

  try {
    const from = envelope.from?.[0];
    
    if (!from?.address) {
      throw new Error('No sender address found');
    }

    const rawSource = typeof source === 'string' ? source : source.toString();
    
    const [savedEmail] = await db
      .insert(schema.email)
      .values({
        uid,
        fromAddress: from.address,
        fromName: from.name || null,
        subject: envelope.subject || 'No Subject',
        textContent: parsedEmail?.text || null,
        htmlContent: parsedEmail?.html || null,
        rawSource,
        receivedAt: new Date(),
        size: metadata?.size || rawSource.length,
        hasAttachments: metadata?.hasAttachments || false,
        processed: false,
      })
      .returning();

    logger.info({ uid, emailId: savedEmail.id }, 'Email archived');
    
    return savedEmail;
  } catch (error) {
    logger.error({ uid, error }, 'Failed to archive email');
    throw error;
  }
}

/**
 * Updates an archived email with processing results
 * Call this after processing to link the email to tickets/requesters/messages
 */
export async function updateArchivedEmail(params: UpdateArchiveParams) {
  const { emailId, ticketId, requesterId, messageId, processed, processingError } = params;

  try {
    const updateData: Partial<schema.NewEmail> = {
      processed: processed ?? true,
      processedAt: processed !== false ? new Date() : undefined,
    };

    if (ticketId !== undefined) updateData.ticketId = ticketId;
    if (requesterId !== undefined) updateData.requesterId = requesterId;
    if (messageId !== undefined) updateData.ticketMessageId = messageId;
    if (processingError !== undefined) updateData.processingError = processingError;

    const [updatedEmail] = await db
      .update(schema.email)
      .set(updateData)
      .where(eq(schema.email.id, emailId))
      .returning();

    logger.info({ emailId }, 'Archived email updated');
    
    return updatedEmail;
  } catch (error) {
    logger.error({ emailId, error }, 'Failed to update archived email');
    throw error;
  };
};

/**
 * Marks an email as failed with error details
 */
export async function markEmailFailed(emailId: number, error: unknown) {
  return updateArchivedEmail({
    emailId,
    processed: false,
    processingError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
  });
}
