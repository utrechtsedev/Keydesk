import { betterAuth, type User } from 'better-auth';
import { admin, magicLink } from 'better-auth/plugins';
import { sendEmail } from './email/email';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from './db/database';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from './db/schema/index.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      verification: schema.verification,
      account: schema.account,
      session: schema.session
    }
  }),
  advanced: {
    database: {
      generateId: 'serial'
    }
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }: { email: string, url: string }): Promise<void> => {
        sendEmail(email, 'Magic Link', `<p>${url}</p>`, `<p>${url}</p>`);
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
      sendEmail(user.email, 'Verification Sign up', `<p>${url}</p>`, `<p>${url}</p>`);
    },
  },
  user: {
    additionalFields: {
      notificationPreferences: {
        type: 'json',
        required: false,
        defaultValue: {
          dashboard: {
            ticketCreated: true,
            itemAssigned: true,
            itemUpdated: true,
            itemClosed: true
          },
          email: {
            ticketCreated: true,
            itemAssigned: true,
            itemUpdated: true,
            itemClosed: true
          }
        }
      }
    }
  }
});
