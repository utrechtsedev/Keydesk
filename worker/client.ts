import { ImapFlow } from "imapflow";
import { Config } from '../src/lib/server/db/models/config.model.ts';
import { type IMAP } from "../src/lib/types/core.ts";
import { decrypt } from '../src/lib/server/db/encrypt.ts'
import { getLogTimestamp } from '../src/lib/utils/date.ts'

let client: ImapFlow | null = null;  // Starts as null

export async function getClient(): Promise<ImapFlow> {
  if (client) {
    return client;
  }

  const imap = await Config.findOne({ where: { key: 'imap' } });

  if (!imap) {
    throw new Error(`[${getLogTimestamp()}] IMAP configuration not found in database, exiting...`);
  }

  const config = JSON.parse(imap.value) as IMAP;

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
