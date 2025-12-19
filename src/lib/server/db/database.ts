import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '$lib/server/db/schema';
import 'dotenv/config';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error('Database URL not found in environment variables.');
}

export const db = drizzle(DATABASE_URL, { schema });


