# Keydesk

Helpdesk built with SvelteKit, PostgreSQL and Drizzle, running on Cloudflare Workers.

It is two Workers:

- **The app** (`wrangler.jsonc`): SvelteKit with `adapter-cloudflare`. It reaches Postgres through Hyperdrive, keeps attachments in R2 and puts slow work, such as sending notifications, on the `keydesk-jobs` queue.
- **The mail Worker** (`workers/mail`): runs the jobs from that queue. It is built with Vite and the Cloudflare plugin, so it can render the email templates, which are Svelte components.

## Development

Requirements: [Bun](https://bun.sh), Node.js 22 or later, and Docker.

1. Start PostgreSQL (it listens on port 5433):

   ```sh
   docker compose up -d db
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

Incoming email is not connected yet: mailboxes, synced by the mail Worker, are the next step.

## Tests

```sh
bun run test
```

Each run drops and recreates the database in `TEST_DATABASE_URL` (set in `.env.test`; its name must end in `_test`), applies the migrations and starts the app and the mail Worker against it. It needs the compose database running.

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

3. The secrets, and `APP_URL` (in both `vars`) set to the address the app runs at:

   ```sh
   bunx wrangler secret put BETTER_AUTH_SECRET
   bunx wrangler secret put ENCRYPTION_KEY
   bunx wrangler secret put ENCRYPTION_KEY -c workers/mail/wrangler.jsonc
   ```

4. In the GitHub repository: the secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `DATABASE_URL` (a direct connection, for the migrations), then the variable `CLOUDFLARE_DEPLOY` set to `true`.

Each deploy applies the migrations first, then deploys the mail Worker, then the app.

The Workers' runtime types (`worker-configuration.d.ts`) are generated when installing; after changing the mail Worker's bindings, run `bun run cf-typegen`. The app's bindings are typed by hand in `src/app.d.ts`, next to its other app-wide types.
