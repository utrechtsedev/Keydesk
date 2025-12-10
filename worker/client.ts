import { ImapFlow } from "imapflow";
import { db } from '../src/lib/server/db/database';
import * as schema from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { type IMAP } from "../src/lib/types/core.ts";
import { decrypt } from '../src/lib/server/db/encrypt.ts';
import { getLogTimestamp } from '../src/lib/utils/date.ts';

let client: ImapFlow | null = null;  // Starts as null

export async function getClient(): Promise<ImapFlow> {
  if (client) {
    return client;
  }

  const [imap] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'imap'));

  if (!imap) {
    throw new Error(`[${getLogTimestamp()}] IMAP configuration not found in database, exiting...`);
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
