import nodemailer from 'nodemailer';
import { type SMTP } from "$lib/types";
import { json, type RequestHandler } from "@sveltejs/kit";
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { smtp } = await request.json() as { smtp: SMTP };

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.SSL,
    auth: {
      user: smtp.username,
      pass: smtp.password,
    },
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('[SETUP] SMTP Connection timeout after 10 seconds')), 10000)
  );

  const connectionPromise = (async () => {
    await transporter.verify();
    logger.info({ host: smtp.host }, 'SMTP connection verified');

    return true;
  })();

  await Promise.race([connectionPromise, timeoutPromise]);

  return json({
    success: true,
    message: `SMTP connection successful! Server is ready to send emails.`
  }, { status: 200 });
}
