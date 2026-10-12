# Keydesk

Helpdesk built with SvelteKit, PostgreSQL and Drizzle, running on Cloudflare Workers.

It is two Workers:

- **The app** (`wrangler.jsonc`): SvelteKit with `adapter-cloudflare`. It reaches Postgres through Hyperdrive, keeps attachments in R2 and puts slow work, such as sending notifications, on the `keydesk-jobs` queue.
- **The mail Worker** (`workers/mail`): runs the jobs from that queue (notifications, replies to requesters) and syncs the mailboxes, each through a Durable Object of its own. It is built with Vite and the Cloudflare plugin, so it can render the email templates, which are Svelte components.

## Development

Requirements: [Bun](https://bun.sh), Node.js 22 or later, and Docker.

1. Start PostgreSQL (port 5433) and a test mail server, GreenMail (SMTP on port 53025, IMAP on 53143; it accepts any user and password):

   ```sh
   docker compose up -d db mail
   ```

2. Copy `.env.example` to `.env` and fill in `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `ENCRYPTION_KEY` (`openssl rand -hex 32`).

3. Install the dependencies and prepare the database:

   ```sh
   bun install
   bun run db:migrate
   ```

4. Create an organization with its first admin. The admin's password is printed once:

   ```sh
   bun run org:create --name "Klant BV" --admin-email jan@klant.nl --admin-name "Jan Jansen"
   ```

   Or run `bun run db:seed` for two demo organizations full of sample data; it prints an admin to sign in as for each.

5. Start the app with `bun run dev` and, in a second terminal, the mail Worker with `bun run dev:mail`. Locally, Cloudflare's bindings are simulated: Hyperdrive connects straight to the database in `localConnectionString` (`wrangler.jsonc`), and R2 and the queue keep their data in `.wrangler/`. Without the mail Worker, queued notifications wait until it starts.

## Organizations

Every row of customer data belongs to an organization. The app reads and writes it through a tenant transaction (`withTenant` in `src/lib/server/db/database.ts`): it runs as the `keydesk_app` role, which row level security limits to that organization's rows, and new rows get the organization by default. Routes get theirs from `requireAuth(locals)`; only better-auth, invitations, the command line tools and `withTenant` use the owner connection, `systemDb`.

Each request, job and command line run opens its own connection (`connect`) and closes it when done, as Cloudflare Workers can't share a connection between requests.

Admins add people under Settings > Users: an invited user gets an email with a link to set their password, sent through the organization's outgoing email settings. When that email can't be sent, the admin gets the link to pass on. Users are managed only through these screens and their endpoints, which work in the tenant transaction; of better-auth's admin endpoints only impersonation is open, and only for users of the admin's own organization.

## Mailboxes

Admins add mailboxes under Settings > Mailboxes: an address with its IMAP and SMTP settings, or one connected at Microsoft 365 or Gmail (credentials encrypted in the database, never sent back to the browser). The mail Worker reads each enabled mailbox every 1 to 5 minutes, through a Durable Object per mailbox whose alarm schedules the next read; a cron every 10 minutes schedules any mailbox that fell behind.

- A new mailbox starts at its newest message: older mail stays out.
- Every email is archived (its source in R2). A reply to a ticket's email (In-Reply-To or References) or one with the ticket number in its subject goes on that ticket; anything else starts a new one. Automatic replies and senders writing more than 2 times in 10 minutes are archived but left out of tickets.
- An agent's reply (not an internal note) is emailed to the requester from the ticket's mailbox, as an answer in the same thread.
- After 3 failed reads in a row, the organization's admins get a notification; reads keep being retried, waiting longer each time.

Locally, a mailbox on the compose GreenMail server works end to end: host `127.0.0.1`, ports 53143 (IMAP) and 53025 (SMTP), without TLS.

The organization's Outgoing Email settings still send sign-in links, invitations and notifications to agents.

### Microsoft 365

A Microsoft 365 mailbox is read and sent through Microsoft Graph, with application permissions an admin of the customer's Microsoft 365 organization grants to Keydesk. Connecting takes two steps at Microsoft: the admin signs in, which tells Keydesk their organization (from the ID token Microsoft issues, never from the address Microsoft redirects back to), and then grants the permissions. Keydesk then checks it can read the address in that organization before saving the mailbox.

It needs one app registration for all of Keydesk, in Microsoft Entra:

- Supported account types: accounts in any organizational directory (multitenant).
- Redirect URI (Web): `<APP_URL>/dashboard/settings/mailboxes/microsoft/callback`.
- API permissions, Microsoft Graph, application: `Mail.Read` and `Mail.Send`.
- A client secret; its value and the application (client) ID go in `MICROSOFT_CLIENT_SECRET` and `MICROSOFT_CLIENT_ID`. Without them, the option to add a Microsoft 365 mailbox doesn't show.

Application permissions reach every mailbox of the customer's organization. Its Exchange admin can limit Keydesk to the support mailboxes with [RBAC for Applications](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac).

Locally, set the two settings in `.env` to try a real app registration with a redirect URI on `http://localhost:5173`. The tests use a stand-in for Microsoft (`test/fakes/microsoft.ts`).

### Gmail

A Gmail or Google Workspace mailbox is read and sent through the Gmail API, with a refresh token its account gives Keydesk when connecting: the admin signs in at Google as that address (Keydesk checks the address in the ID token Google issues) and allows Keydesk to read the mail and send as it. When Google forgets the inbox's history (after about a week without a sync), Keydesk reads the inbox's mail since its last sync instead. When the access is withdrawn, the mailbox shows it and needs connecting again.

It needs one OAuth client for all of Keydesk, in Google Cloud:

- The Gmail API enabled, and an OAuth consent screen with the scopes `gmail.readonly` and `gmail.send`. `gmail.readonly` is a restricted scope (and `gmail.send` a sensitive one): for accounts outside your own Google Workspace, Google has to verify the app, including a yearly security assessment, before anyone but its test users can connect.
- An OAuth client ID of type Web application, with the redirect URI `<APP_URL>/dashboard/settings/mailboxes/google/callback`. Its ID and secret go in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

The tests use a stand-in for Google (`test/fakes/google.ts`), which, like Gmail, gives sent messages a Message-ID of its own: Keydesk reads that back after sending, so answers find their ticket.

## Tests

```sh
bun run test
```

Each run drops and recreates the database in `TEST_DATABASE_URL` (set in `.env.test`; its name must end in `_test`), applies the migrations and starts the app and the mail Worker against it. It needs the compose database and mail server running.

`TEST_APP=build bun run test` runs the route tests against the built app in workerd, the runtime Cloudflare uses, instead of the dev server; run `bun run build` first. CI does both.

## Database changes

Change the schema in `src/lib/server/db/schema`, then create a migration in `drizzle/` with `bun run db:generate` and apply it with `bun run db:migrate`.

## Deploying to Cloudflare

The Deploy workflow (`.github/workflows/deploy.yml`) deploys both Workers after CI passes on `main`, once the account is set up:

1. A Postgres database that Hyperdrive can reach, then a Hyperdrive configuration for it, **with caching disabled**: its cache keys on the query text, not on the organization a tenant transaction sets, so it could serve one organization's rows to another.

   ```sh
   bunx wrangler hyperdrive create keydesk --connection-string="postgres://..." --caching-disabled
   ```

   Put its id in both `wrangler.jsonc` and `workers/mail/wrangler.jsonc`.

2. The R2 bucket and the queues:

   ```sh
   bunx wrangler r2 bucket create keydesk-attachments
   bunx wrangler queues create keydesk-jobs
   bunx wrangler queues create keydesk-jobs-failed
   ```

3. `APP_URL` in the `vars` of both `wrangler.jsonc` files, set to the address the app runs at.

4. In the GitHub repository: the secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL` (a direct connection, for the migrations), `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY`, and for Microsoft 365 and Gmail mailboxes `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (see Mailboxes). Then the variable `CLOUDFLARE_DEPLOY` set to `true`.

Each deploy applies the migrations first, then deploys the mail Worker, then the app, each with the secrets from the repository. A secret removed from the repository stays on the Workers until it is removed there with `wrangler secret delete`.

The Workers' runtime types (`worker-configuration.d.ts`) are generated when installing; after changing the mail Worker's bindings, run `bun run cf-typegen`. The app's bindings are typed by hand in `src/app.d.ts`, next to its other app-wide types.
