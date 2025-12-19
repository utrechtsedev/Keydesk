import { ImapFlow } from 'imapflow';
import { db } from '$lib/server/db/database';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { type IMAP } from '$lib/types';
import { decrypt } from '$lib/server/db/encrypt';

let client: ImapFlow | null = null;

export async function getClient(): Promise<ImapFlow> {
  if (client) {
    return client;
  }

  const [imap] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'imap'));

  if (!imap) {
    throw new Error('IMAP configuration not found in database');
  }

  const config = imap.value as IMAP;

  client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.SSL,
    auth: {
      user: config.username,
      pass: decrypt(config.password),
    },
    logger: false,
    disableAutoIdle: true
  });

  return client;
}
