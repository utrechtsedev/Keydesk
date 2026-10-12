import nodemailer from 'nodemailer';
import { withTenant, type SystemDb, type TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '#lib/server/db/encrypt.js';
import type { SMTP } from '#lib/types/index.js';
import type { Email, EmailOrganization } from './compose.js';
import { logger } from '#lib/server/logger.js';

/** How to reach an SMTP server; without a user name, Keydesk doesn't sign in */
export interface SmtpServer {
	host: string;
	port: number;
	secure: boolean;
	username?: string;
	password?: string;
}

/**
 * A connection to an SMTP server for one email. It signs in only with a user name: a server that
 * offers authentication refuses a client that tries it without credentials.
 */
export function createSmtpTransport(server: SmtpServer) {
	return nodemailer.createTransport({
		host: server.host,
		port: server.port,
		secure: server.secure,
		auth: server.username ? { user: server.username, pass: server.password ?? '' } : undefined
	});
}

/** The organization's outgoing email settings as a server to connect to */
export function organizationSmtpServer(smtp: SMTP, password: string): SmtpServer {
	return {
		host: smtp.host,
		port: smtp.port,
		secure: smtp.SSL,
		...(smtp.enableAuthentication ? { username: smtp.username, password } : {})
	};
}

/**
 * Sends an email through the SMTP settings of the organization `db` belongs to. Each email gets
 * its own SMTP connection: Cloudflare Workers can't keep a connection open between requests, so
 * the settings are read and the connection made when sending.
 */
export async function sendEmail(db: TenantDb, to: string, email: Email): Promise<void> {
	const [row] = await db.select().from(schema.config).where(eq(schema.config.key, 'smtp'));
	if (!row) {
		throw new Error('Email not configured');
	}

	const smtp = row.value as SMTP;
	const transporter = createSmtpTransport(
		organizationSmtpServer(smtp, smtp.password ? decrypt(smtp.password) : '')
	);

	try {
		await transporter.sendMail({
			from: `${smtp.senderName} <${smtp.senderEmail}>`,
			to,
			subject: email.subject,
			html: email.html,
			text: email.text
		});
	} finally {
		transporter.close();
	}
}

/**
 * Sends an email to a user through their organization's SMTP settings, for mail that starts
 * outside a request, such as better-auth's sign-in links. `compose` writes it for the user's
 * organization. It never throws: mail to an address without an account is dropped and a failed
 * send is logged, so better-auth answers the same whether or not an address has an account.
 */
export async function sendEmailToUser(
	systemDb: SystemDb,
	address: string,
	compose: (organization: EmailOrganization) => Email
): Promise<void> {
	const [user] = await systemDb
		.select({ organizationId: schema.user.organizationId })
		.from(schema.user)
		.where(eq(schema.user.email, address));
	if (!user) {
		logger.info('No account for this address; not sending');
		return;
	}

	try {
		await withTenant(systemDb, user.organizationId, async (db) => {
			const [organization] = await db
				.select()
				.from(schema.organization)
				.where(eq(schema.organization.id, user.organizationId));
			await sendEmail(db, address, compose(organization));
		});
	} catch (error) {
		logger.error({ error, organizationId: user.organizationId }, 'Failed to send email to user');
	}
}
