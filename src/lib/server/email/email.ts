import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '$lib/server/db/encrypt';
import type { SMTP } from '$lib/types';
import { logger } from '../logger';

let transporter: Transporter | null = null;
let configCache: SMTP | null = null;
let lastConfigFetch = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

async function getEmailConfig(): Promise<SMTP | null> {
  const now = Date.now();
  if (configCache && (now - lastConfigFetch) < CONFIG_CACHE_TTL) {
    return configCache;
  }

  const [request] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'smtp'));

  if (!request) {
    logger.warn('Email SMTP settings not available, cannot send email.');
    return null;
  }

  const emailSettings: SMTP = request.value as SMTP;
  if (emailSettings.password) emailSettings.password = decrypt(emailSettings.password);

  configCache = emailSettings;
  lastConfigFetch = now;

  return emailSettings;
}

export async function getTransporter(): Promise<Transporter | null> {
  const config = await getEmailConfig();
  if (!config) return null;

  if (transporter && configCache) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    auth: {
      user: config.username ?? '',
      pass: config.password ?? '',
    },
    secure: config.SSL,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
}

export function invalidateTransporter(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
  configCache = null;
  lastConfigFetch = 0;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const transporter = await getTransporter();
  if (!transporter || !configCache) {
    throw new Error('Email not configured');
  }

  await transporter.sendMail({
    from: `${configCache.senderName} <${configCache.senderEmail}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });
}
