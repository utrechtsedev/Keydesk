import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  dialect: 'postgresql',
  // Only the table definitions; the folder also holds relations, validation and their tests
  schema: './src/lib/server/db/schema/tables.ts',

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  extensionsFilters: ['postgis'],
  schemaFilter: 'public',
  tablesFilter: '*',

  introspect: {
    casing: 'camel',
  },

  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations__',
    schema: 'public',
  },

  // Lets drizzle-kit create the keydesk_app role the row level security policies are for
  entities: {
    roles: true
  },

  breakpoints: true,
  strict: true,
  verbose: true,
});

