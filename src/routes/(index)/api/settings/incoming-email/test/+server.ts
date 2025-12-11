import { ImapFlow } from "imapflow";
import { type IMAP } from "$lib/types";
import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { imap } = await request.json() as { imap: IMAP };

  const testClient = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: imap.SSL,
    auth: {
      user: imap.username,
      pass: imap.password,
    },
    logger: false,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
  );

  const connectionPromise = (async () => {
    await testClient.connect();
    console.log('[SETUP] IMAP Connected successfully');

    await testClient.mailboxOpen('INBOX');
    console.log('[SETUP] IMAP Mailbox opened');

    const mailboxInfo = await testClient.status('INBOX', { messages: true });
    console.log('[SETUP] IMAP Mailbox info retrieved:', mailboxInfo);

    await testClient.logout();
    console.log('[SETUP] IMAP Logged out');

    return mailboxInfo;
  })();

  const mailboxInfo = await Promise.race([connectionPromise, timeoutPromise]) as any;

  return json({
    success: true,
    message: `Connection successful! Found ${mailboxInfo.messages} messages in Inbox.`
  }, { status: 200 });
}
