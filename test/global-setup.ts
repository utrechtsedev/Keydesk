import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createServer, isRunnableDevEnvironment } from 'vite';
import type { TestProject } from 'vitest/node';
import type * as AppShutdown from '../src/lib/server/shutdown.js';

declare module 'vitest' {
	export interface ProvidedContext {
		/** Base URL of the app the route tests talk to */
		appUrl: string;
	}
}

/**
 * Gives every test run a fresh database (drop and recreate it, apply the migrations and load the
 * default configuration, exactly as `bun run db:migrate` and `bun run db:init` would), then starts
 * the app against it, the way `bun run dev` does, for the route tests.
 */
export default async function setup(project: TestProject) {
	const url = project.config.env.DATABASE_URL;
	if (!url) {
		throw new Error('TEST_DATABASE_URL is not set; see .env.test');
	}

	await recreateDatabase(url);

	// The app runs in this process, so it needs the same environment the test files get
	Object.assign(process.env, project.config.env);

	const server = await createServer({
		configFile: 'vite.config.ts',
		logLevel: 'error',
		server: { host: '127.0.0.1', port: 0, watch: null, hmr: false }
	});
	await server.listen();

	const address = server.httpServer?.address();
	if (!address || typeof address === 'string') {
		throw new Error('The app for the route tests did not start');
	}
	const appUrl = `http://127.0.0.1:${address.port}`;

	// better-auth reads its base URL when the first request creates it, which happens after this
	process.env.BETTER_AUTH_URL = appUrl;
	project.provide('appUrl', appUrl);

	return async () => {
		// The app's queue workers and database pool would otherwise keep this process alive
		const ssr = server.environments.ssr;
		if (isRunnableDevEnvironment(ssr)) {
			const app = await ssr.runner.import<typeof AppShutdown>('/src/lib/server/shutdown.ts');
			await app.shutdown();
		}
		await server.close();
	};
}

async function recreateDatabase(url: string) {
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
