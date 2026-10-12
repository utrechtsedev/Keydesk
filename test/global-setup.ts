import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { TestProject } from 'vitest/node';

/**
 * Gives every test run a fresh database: drop and recreate it, apply the migrations and load the
 * default configuration, exactly as `bun run db:migrate` and `bun run db:init` would.
 */
export default async function setup(project: TestProject) {
	const url = project.config.env.DATABASE_URL;
	if (!url) {
		throw new Error('TEST_DATABASE_URL is not set; see .env.test');
	}

	const name = decodeURIComponent(new URL(url).pathname.slice(1));
	if (!name.endsWith('_test')) {
		throw new Error(`Refusing to reset database "${name}": a test database name must end in _test`);
	}

	const maintenanceUrl = new URL(url);
	maintenanceUrl.pathname = '/postgres';
	const admin = new pg.Client({ connectionString: maintenanceUrl.toString() });
	await admin.connect();
	try {
		const identifier = admin.escapeIdentifier(name);
		await admin.query(`DROP DATABASE IF EXISTS ${identifier} WITH (FORCE)`);
		await admin.query(`CREATE DATABASE ${identifier}`);
	} finally {
		await admin.end();
	}

	const db = drizzle({ connection: { connectionString: url } });
	try {
		await migrate(db, {
			migrationsFolder: 'drizzle',
			migrationsTable: '__drizzle_migrations__',
			migrationsSchema: 'public'
		});
	} finally {
		await db.$client.end();
	}

	execFileSync('bun', ['run', 'db:init'], {
		env: { ...process.env, DATABASE_URL: url },
		stdio: 'pipe'
	});
}
