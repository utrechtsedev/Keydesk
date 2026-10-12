import { and, asc, desc, eq, isNotNull } from 'drizzle-orm';
import type { TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { createSmtpTransport } from '#lib/server/email/email.js';
import { replyEmail } from '#lib/server/email/compose.js';
import { logger } from '#lib/server/logger.js';
import { getTicketPrefix } from '#lib/server/services/ticket.service.js';
import { openCredentials } from './credentials.js';

/** How many earlier messages a reply names in References; enough for any mail program's threading */
const MAX_REFERENCES = 10;

/**
 * The mailbox a ticket's replies go out from: the one it came in on, or for a ticket started in
 * the dashboard, the organization's first enabled mailbox
 */
async function replyMailbox(db: TenantDb, ticket: schema.Ticket): Promise<schema.Mailbox | null> {
	if (ticket.mailboxId !== null) {
		const [mailbox] = await db
			.select()
			.from(schema.mailbox)
			.where(eq(schema.mailbox.id, ticket.mailboxId));
		if (mailbox) return mailbox;
	}
	const [first] = await db
		.select()
		.from(schema.mailbox)
		.where(eq(schema.mailbox.enabled, true))
		.orderBy(asc(schema.mailbox.id))
		.limit(1);
	return first ?? null;
}

/** The subject of a reply: the ticket's, as an answer, with the ticket number to match replies */
export function replySubject(subject: string, ticketReference: string): string {
	const answer = /^(re|aw|antw):/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim()}`;
	return answer.toLowerCase().includes(ticketReference.toLowerCase())
		? answer
		: `${answer} [${ticketReference}]`;
}

/**
 * Emails an agent's reply to the ticket's requester, from the ticket's mailbox, as an answer to the
 * conversation so far (In-Reply-To and References). Saves the reply's Message-ID, which is how the
 * requester's answer finds the ticket again. Does nothing for an internal note, a reply already
 * sent or an organization without a mailbox.
 */
export async function sendReply(db: TenantDb, ticketMessageId: number): Promise<void> {
	const [message] = await db
		.select()
		.from(schema.ticketMessage)
		.where(eq(schema.ticketMessage.id, ticketMessageId));
	if (!message || message.isPrivate || message.emailMessageId) return;

	const [{ ticket, requester, organization }] = await db
		.select({
			ticket: schema.ticket,
			requester: schema.requester,
			organization: schema.organization
		})
		.from(schema.ticket)
		.innerJoin(schema.requester, eq(schema.requester.id, schema.ticket.requesterId))
		.innerJoin(schema.organization, eq(schema.organization.id, schema.ticket.organizationId))
		.where(eq(schema.ticket.id, message.ticketId));

	const mailbox = await replyMailbox(db, ticket);
	if (!mailbox) {
		logger.info({ ticketId: ticket.id }, 'No mailbox to send the reply from; it stays in Keydesk');
		return;
	}

	const earlier = await db
		.select({
			emailMessageId: schema.ticketMessage.emailMessageId,
			senderType: schema.ticketMessage.senderType
		})
		.from(schema.ticketMessage)
		.where(
			and(
				eq(schema.ticketMessage.ticketId, ticket.id),
				isNotNull(schema.ticketMessage.emailMessageId)
			)
		)
		.orderBy(desc(schema.ticketMessage.createdAt))
		.limit(MAX_REFERENCES);
	const references = earlier.map((row) => row.emailMessageId!).reverse();
	const inReplyTo =
		earlier.find((row) => row.senderType === 'requester')?.emailMessageId ??
		earlier[0]?.emailMessageId;

	const ticketReference = `${await getTicketPrefix(db)}${ticket.ticketNumber}`;
	const email = replyEmail({
		organization,
		subject: replySubject(ticket.subject, ticketReference),
		html: message.message,
		ticketReference
	});
	const domain = mailbox.address.split('@')[1];
	const messageId = `<${crypto.randomUUID()}@${domain}>`;

	const { smtp } = openCredentials(mailbox.credentials);
	const transporter = createSmtpTransport(smtp);
	try {
		await transporter.sendMail({
			from: { name: mailbox.name, address: mailbox.address },
			to: requester.email,
			subject: email.subject,
			html: email.html,
			text: email.text,
			messageId,
			...(inReplyTo ? { inReplyTo } : {}),
			...(references.length > 0 ? { references } : {})
		});
	} finally {
		transporter.close();
	}

	await db
		.update(schema.ticketMessage)
		.set({ emailMessageId: messageId })
		.where(eq(schema.ticketMessage.id, message.id));
	if (ticket.mailboxId === null) {
		await db
			.update(schema.ticket)
			.set({ mailboxId: mailbox.id })
			.where(eq(schema.ticket.id, ticket.id));
	}
}
