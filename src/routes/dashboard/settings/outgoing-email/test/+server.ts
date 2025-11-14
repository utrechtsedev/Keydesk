import nodemailer from 'nodemailer';
import { type SMTP } from "$lib/types";
import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  try {
    const { smtp } = await request.json() as { smtp: SMTP };

    console.log('[SETUP] Testing SMTP connection to:', smtp.host);

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
      console.log('[SETUP] SMTP connection verified');

      return true;
    })();

    await Promise.race([connectionPromise, timeoutPromise]);

    return json({
      success: true,
      message: `SMTP connection successful! Server is ready to send emails.`
    }, { status: 200 });

  } catch (error) {
    console.error('SMTP test error:', error);

    return json({
      success: false,
      message: 'Connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}
