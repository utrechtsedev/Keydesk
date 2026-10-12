import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { systemDb, withTenant, type TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '#lib/server/db/encrypt.js';
import type { SMTP } from '#lib/types/index.js';
import { logger } from '../logger';

interface Transport {
  settings: string;
  config: SMTP;
  transporter: Transporter;
  fetchedAt: number;
}

/** Each organization sends through its own SMTP settings */
const transports = new Map<number, Transport>();
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

async function getTransport(db: TenantDb, organizationId: number): Promise<Transport | null> {
  const cached = transports.get(organizationId);
  if (cached && Date.now() - cached.fetchedAt < CONFIG_CACHE_TTL) {
    return cached;
  }

  const [row] = await db.select().from(schema.config).where(eq(schema.config.key, 'smtp'));

  if (!row) {
    logger.warn({ organizationId }, 'Email SMTP settings not available, cannot send email.');
    return null;
  }

  // Keep the pooled connections while the settings stay the same
  const settings = JSON.stringify(row.value);
  if (cached && cached.settings === settings) {
    cached.fetchedAt = Date.now();
    return cached;
  }
  cached?.transporter.close();

  const config = { ...(row.value as SMTP) };
  if (config.password) config.password = decrypt(config.password);

  const transport: Transport = {
    settings,
    config,
    fetchedAt: Date.now(),
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: {
        user: config.username ?? '',
        pass: config.password ?? ''
      },
      secure: config.SSL,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    })
  };
  transports.set(organizationId, transport);
  return transport;
}

/** Sends an email through the SMTP settings of the organization `db` belongs to */
export async function sendEmail(
  db: TenantDb,
  organizationId: number,
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const transport = await getTransport(db, organizationId);
  if (!transport) {
    throw new Error('Email not configured');
  }

  await transport.transporter.sendMail({
    from: `${transport.config.senderName} <${transport.config.senderEmail}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '')
  });
}

/**
 * Sends an email to a user through their organization's SMTP settings, for mail that starts
 * outside a request, such as better-auth's sign-in links. It never throws: mail to an address
 * without an account is dropped and a failed send is logged, so better-auth answers the same
 * whether or not an address has an account.
 */
export async function sendEmailToUser(
  email: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const [user] = await systemDb
    .select({ organizationId: schema.user.organizationId })
    .from(schema.user)
    .where(eq(schema.user.email, email));
  if (!user) {
    logger.info('No account for this address; not sending');
    return;
  }

  try {
    await withTenant(user.organizationId, (db) =>
      sendEmail(db, user.organizationId, email, subject, html, text)
    );
  } catch (error) {
    logger.error({ error, organizationId: user.organizationId }, 'Failed to send email to user');
  }
}
