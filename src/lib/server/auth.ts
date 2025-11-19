import "dotenv/config"
const { DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_HOST } = process.env;
import { betterAuth, type User } from "better-auth";
import { admin, magicLink } from "better-auth/plugins";
import { createPool } from "mysql2/promise";
import { sendEmail } from "./email/email";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";

export const auth = betterAuth({
  database: createPool({
    host: DATABASE_HOST ?? '127.0.0.1',
    user: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
    connectionLimit: 10,
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }: { email: string, url: string }): Promise<void> => {
        sendEmail(email, 'Magic Link', `<p>${url}</p>`, `<p>${url}</p>`)
      }
    }),
    admin(),
    sveltekitCookies(getRequestEvent)
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }: { user: User, url: string }): Promise<void> => {
      sendEmail(user.email, 'Verification Sign up', `<p>${url}</p>`, `<p>${url}</p>`)
    },
  },
})
