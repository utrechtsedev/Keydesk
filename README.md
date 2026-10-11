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
   bun run db:init
   ```

   `bun run db:seed` adds sample tickets, tasks and users.

4. Start the app with `bun run dev`.

## Tests

```sh
bun run test
```

Each run drops and recreates the database in `TEST_DATABASE_URL` (set in `.env.test`; its name must end in `_test`), applies the migrations and loads the defaults. It needs the compose database running.

## Database changes

Change the schema in `src/lib/server/db/schema`, then create a migration in `drizzle/` with `bun run db:generate` and apply it with `bun run db:migrate`.
