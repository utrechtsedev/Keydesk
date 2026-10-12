# Keydesk

Helpdesk built with SvelteKit, PostgreSQL and Drizzle.

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

5. Start the app with `bun run dev`.

## Organizations

Every row of customer data belongs to an organization. The app reads and writes it through a tenant transaction (`withTenant` in `src/lib/server/db/database.ts`): it runs as the `keydesk_app` role, which row level security limits to that organization's rows, and new rows get the organization by default. Routes get theirs from `requireAuth(locals)`; only better-auth, the command line tools and `withTenant` use the owner connection, `systemDb`.

The email worker in `worker/` still reads a single IMAP inbox, for the organization in `ORGANIZATION_ID`.

## Tests

```sh
bun run test
```

Each run drops and recreates the database in `TEST_DATABASE_URL` (set in `.env.test`; its name must end in `_test`), applies the migrations and loads the defaults. It needs the compose database running.

## Database changes

Change the schema in `src/lib/server/db/schema`, then create a migration in `drizzle/` with `bun run db:generate` and apply it with `bun run db:migrate`.
