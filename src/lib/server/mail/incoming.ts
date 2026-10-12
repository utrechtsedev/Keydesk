import { simpleParser, type AddressObject, type ParsedMail } from 'mailparser';
import { and, count, desc, eq, gte, inArray, isNull, ne } from 'drizzle-orm';
import type { TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { Attachment } from '#lib/types/index.js';
import { attachmentProblem, storeAttachment, storeEmailSource } from '#lib/server/attachments.js';
import { textToHtml } from '#lib/server/html.js';
import { logger } from '#lib/server/logger.js';
import { allocateTicketNumber, getTicketPrefix } from '#lib/server/services/ticket.service.js';
import { sanitizeEmailHtml } from './sanitize.js';

export interface IncomingEmail {
	providerMessageId: string;
	size: number;
	/** The message source, or null when the provider couldn't give it */
	raw: Uint8Array | null;
}

/** What became of an email; anything but `ticket` leaves the email in the archive only */
export type Outcome =
	| { result: 'ticket'; ticketId: number; created: boolean }
	| { result: 'duplicate' }
	| { result: 'ignored'; reason: string }
	| { result: 'failed'; reason: string };

/** A sender may start or add to tickets this often; more is most likely a mail loop */
const RATE_LIMITS = [
	{ windowMinutes: 10, maxEmails: 2 },
	{ windowMinutes: 60, maxEmails: 5 }
];

/**
 * Turns an email that came in on a mailbox into a ticket message: a reply to a ticket's email (by
 * In-Reply-To or References), or with the ticket number in the subject, goes on that ticket;
 * anything else starts a new one. Every email is archived first, and a mailbox never processes the
 * same message twice. Runs in the organization's tenant transaction.
 */
export async function processIncomingEmail(
	db: TenantDb,
	organizationId: number,
	mailbox: schema.Mailbox,
	email: IncomingEmail
): Promise<Outcome> {
	const parsed = email.raw ? await simpleParser(Buffer.from(email.raw)) : null;
	const from = parsed ? firstAddress(parsed.from) : null;

	const [archived] = await db
		.insert(schema.email)
		.values({
			mailboxId: mailbox.id,
			providerMessageId: email.providerMessageId,
			messageId: parsed?.messageId ?? null,
			fromAddress: from?.address ?? '',
			fromName: from?.name || null,
			subject: (parsed?.subject || 'No Subject').slice(0, 500),
			textContent: parsed?.text ?? null,
			htmlContent: parsed?.html || null,
			receivedAt: parsed?.date ?? new Date(),
			size: email.size,
			hasAttachments: (parsed?.attachments.length ?? 0) > 0,
			processed: false
		})
		.onConflictDoNothing({ target: [schema.email.mailboxId, schema.email.providerMessageId] })
		.returning();
	if (!archived) return { result: 'duplicate' };

	if (email.raw) {
		await storeEmailSource(organizationId, archived.id, email.raw);
	}

	const outcome = await decide(db, organizationId, mailbox, archived, parsed, from);
	await db
		.update(schema.email)
		.set(
			outcome.result === 'ticket'
				? { processed: true, processedAt: new Date() }
				: { processed: false, processingError: outcome.reason }
		)
		.where(eq(schema.email.id, archived.id));
	return outcome;
}

async function decide(
	db: TenantDb,
	organizationId: number,
	mailbox: schema.Mailbox,
	archived: schema.Email,
	parsed: ParsedMail | null,
	from: { address: string; name: string } | null
): Promise<Exclude<Outcome, { result: 'duplicate' }>> {
	if (!parsed) {
		return { result: 'failed', reason: 'The message was too large or no longer available' };
	}
	if (!from) {
		return { result: 'failed', reason: 'The message has no sender' };
	}
	if (from.address === mailbox.address) {
		return { result: 'ignored', reason: 'Sent from this mailbox' };
	}
	const automatic = automaticReason(parsed);
	if (automatic) {
		return { result: 'ignored', reason: automatic };
	}
	if (parsed.messageId && (await alreadyReceived(db, mailbox.id, archived.id, parsed.messageId))) {
		return { result: 'ignored', reason: 'Already received with this Message-ID' };
	}
	const limited = await rateLimited(db, archived);
	if (limited) {
		return { result: 'ignored', reason: limited };
	}

	const requester = await findOrCreateRequester(db, from);
	const existing = await findTicket(db, parsed);
	const ticket = existing ?? (await createTicket(db, organizationId, mailbox, parsed, requester));

	const html = parsed.html ? sanitizeEmailHtml(parsed.html) : textToHtml(parsed.text ?? '');
	const attachments = parsed.attachments.filter(
		(attachment) => attachment.contentDisposition !== 'inline'
	);
	const [message] = await db
		.insert(schema.ticketMessage)
		.values({
			ticketId: ticket.id,
			senderType: 'requester',
			requesterId: requester.id,
			senderName: requester.name,
			senderEmail: requester.email,
			message: html,
			isPrivate: false,
			channel: 'email',
			hasAttachments: attachments.length > 0,
			emailMessageId: parsed.messageId ?? null
		})
		.returning();

	await storeAttachments(db, organizationId, ticket.id, message.id, requester, attachments);

	await db
		.update(schema.ticket)
		.set({
			lastRequesterResponseAt: new Date(),
			// Replies go out from the mailbox the customer wrote to
			...(ticket.mailboxId === null ? { mailboxId: mailbox.id } : {})
		})
		.where(eq(schema.ticket.id, ticket.id));
	await db
		.update(schema.email)
		.set({ ticketId: ticket.id, requesterId: requester.id, ticketMessageId: message.id })
		.where(eq(schema.email.id, archived.id));

	return { result: 'ticket', ticketId: ticket.id, created: !existing };
}

function firstAddress(
	addresses: AddressObject | AddressObject[] | undefined
): { address: string; name: string } | null {
	const list = Array.isArray(addresses) ? addresses : addresses ? [addresses] : [];
	for (const group of list) {
		for (const entry of group.value) {
			if (entry.address) {
				return { address: entry.address.toLowerCase(), name: entry.name || '' };
			}
		}
	}
	return null;
}

/**
 * Why an email was sent by a machine (an out-of-office reply, a bounce, a bulk mailing), going by
 * the headers RFC 3834 and common mail software set. Answering those could start a mail loop.
 */
export function automaticReason(parsed: Pick<ParsedMail, 'headers'>): string | null {
	const header = (name: string) => {
		const value = parsed.headers.get(name);
		return typeof value === 'string' ? value.trim().toLowerCase() : value ? String(value) : '';
	};

	const autoSubmitted = header('auto-submitted');
	if (autoSubmitted && autoSubmitted !== 'no')
		return `Automatic email (Auto-Submitted: ${autoSubmitted})`;
	if (header('x-autoreply') || header('x-autorespond')) return 'Automatic reply';
	const precedence = header('precedence');
	if (['auto_reply', 'bulk', 'junk'].includes(precedence)) {
		return `Automatic email (Precedence: ${precedence})`;
	}
	return null;
}

async function alreadyReceived(
	db: TenantDb,
	mailboxId: number,
	emailId: number,
	messageId: string
): Promise<boolean> {
	const [earlier] = await db
		.select({ id: schema.email.id })
		.from(schema.email)
		.where(
			and(
				eq(schema.email.mailboxId, mailboxId),
				eq(schema.email.messageId, messageId),
				ne(schema.email.id, emailId)
			)
		)
		.limit(1);
	return earlier !== undefined;
}

/** Counts the sender's earlier emails, not this one */
async function rateLimited(db: TenantDb, archived: schema.Email): Promise<string | null> {
	for (const { windowMinutes, maxEmails } of RATE_LIMITS) {
		const [{ value }] = await db
			.select({ value: count() })
			.from(schema.email)
			.where(
				and(
					eq(schema.email.fromAddress, archived.fromAddress),
					ne(schema.email.id, archived.id),
					eq(schema.email.processed, true),
					gte(schema.email.createdAt, new Date(Date.now() - windowMinutes * 60_000))
				)
			);
		if (value >= maxEmails) {
			return `More than ${maxEmails} emails from this sender in ${windowMinutes} minutes`;
		}
	}
	return null;
}

async function findOrCreateRequester(
	db: TenantDb,
	from: { address: string; name: string }
): Promise<schema.Requester> {
	const [created] = await db
		.insert(schema.requester)
		.values({ email: from.address, name: from.name || from.address })
		.onConflictDoNothing({ target: [schema.requester.organizationId, schema.requester.email] })
		.returning();
	if (created) return created;

	const [existing] = await db
		.select()
		.from(schema.requester)
		.where(eq(schema.requester.email, from.address));
	return existing;
}

/**
 * The ticket an email answers: the one whose email it names in In-Reply-To or References, or the
 * one whose number is in the subject
 */
async function findTicket(db: TenantDb, parsed: ParsedMail): Promise<schema.Ticket | null> {
	const references = [
		...(parsed.inReplyTo ? [parsed.inReplyTo] : []),
		...(Array.isArray(parsed.references)
			? parsed.references
			: parsed.references
				? [parsed.references]
				: [])
	];
	if (references.length > 0) {
		const [byReference] = await db
			.select({ ticket: schema.ticket })
			.from(schema.ticketMessage)
			.innerJoin(schema.ticket, eq(schema.ticket.id, schema.ticketMessage.ticketId))
			.where(
				and(
					inArray(schema.ticketMessage.emailMessageId, references),
					isNull(schema.ticket.deletedAt)
				)
			)
			.orderBy(desc(schema.ticketMessage.createdAt))
			.limit(1);
		if (byReference) return byReference.ticket;
	}

	const number = ticketNumberIn(parsed.subject ?? '', await getTicketPrefix(db));
	if (number === null) return null;
	const [bySubject] = await db
		.select()
		.from(schema.ticket)
		.where(and(eq(schema.ticket.ticketNumber, number), isNull(schema.ticket.deletedAt)));
	return bySubject ?? null;
}

/** The ticket number in a subject such as "Re: Printer broken [TKT-42]" */
export function ticketNumberIn(subject: string, prefix: string): number | null {
	const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = subject.match(new RegExp(`${escaped}(\\d+)`, 'i'));
	return match ? Number(match[1]) : null;
}

async function createTicket(
	db: TenantDb,
	organizationId: number,
	mailbox: schema.Mailbox,
	parsed: ParsedMail,
	requester: schema.Requester
): Promise<schema.Ticket> {
	const [status] = await db
		.select()
		.from(schema.status)
		.where(eq(schema.status.isDefault, true))
		.limit(1);
	const [priority] = await db
		.select()
		.from(schema.priority)
		.orderBy(desc(schema.priority.isDefault))
		.limit(1);
	if (!status || !priority) {
		throw new Error('The organization has no default status or no priority');
	}

	const [ticket] = await db
		.insert(schema.ticket)
		.values({
			ticketNumber: await allocateTicketNumber(db, organizationId),
			requesterId: requester.id,
			subject: (parsed.subject || 'No Subject').slice(0, 500),
			channel: 'email',
			statusId: status.id,
			priorityId: priority.id,
			mailboxId: mailbox.id,
			targetDate: new Date(),
			lastRequesterResponseAt: new Date()
		})
		.returning();
	return ticket;
}

async function storeAttachments(
	db: TenantDb,
	organizationId: number,
	ticketId: number,
	messageId: number,
	requester: schema.Requester,
	attachments: ParsedMail['attachments']
): Promise<void> {
	if (attachments.length === 0) return;

	const [config] = await db
		.select()
		.from(schema.config)
		.where(eq(schema.config.key, 'attachments'));
	const settings = (config?.value ?? { enabled: false }) as Attachment;

	for (const attachment of attachments) {
		const file = new File(
			[new Uint8Array(attachment.content)],
			attachment.filename || 'attachment',
			{
				type: attachment.contentType || 'application/octet-stream'
			}
		);
		const problem = attachmentProblem(file, settings);
		if (problem) {
			logger.info({ ticketId, problem }, 'Skipped an email attachment');
			continue;
		}

		const stored = await storeAttachment(organizationId, file, settings);
		await db.insert(schema.ticketAttachment).values({
			ticketId,
			messageId,
			fileName: stored.fileName,
			originalFileName: stored.originalFileName,
			storageKey: stored.storageKey,
			fileSize: stored.size,
			mimeType: stored.mimeType,
			uploadedByType: 'requester',
			uploadedById: requester.id,
			uploadedByName: requester.name || requester.email
		});
	}
}

/** For the sync's log: a short line per email */
export function describeOutcome(outcome: Outcome): string {
	return outcome.result === 'ticket'
		? `${outcome.created ? 'New' : 'Added to'} ticket ${outcome.ticketId}`
		: outcome.result === 'duplicate'
			? 'Already processed'
			: `${outcome.result}: ${outcome.reason}`;
}
