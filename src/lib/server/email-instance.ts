import nodemailer from "nodemailer";
import { models } from "./db/models";
import { decrypt } from "./db/encrypt";
import type { SMTP } from "$lib/types";

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const request = await models.Config.findOne({ where: { key: 'email' } })
  if (!request) return console.error('Email settings not available')

  const emailSettings: SMTP = JSON.parse(request.value);
  emailSettings.password = decrypt(emailSettings.password)

  const transporter = nodemailer.createTransport({
    host: emailSettings.host,
    port: emailSettings.port,
    from: `${emailSettings.senderName} <${emailSettings.senderEmail}>`,
    auth: {
      user: emailSettings.username ?? "",
      pass: emailSettings.password ?? "",
    },
    secure: emailSettings.SSL,
    opportunisticTLS: true,
  });

  await transporter.sendMail({
    to,
    subject,
    html,
    text,
  })
}
