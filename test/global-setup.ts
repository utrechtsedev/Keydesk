import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import type { TestProject } from 'vitest/node';
import { testRegistryPath } from '../vite.config.js';

declare module 'vitest' {
	export interface ProvidedContext {
		/** Base URL of the app the route tests talk to */
		appUrl: string;
	}
}

/**
 * Gives every test run a fresh database (drop and recreate it, then apply the migrations as
 * `bun run db:migrate` would) and starts the app and the mail Worker against it, the way
 * `bun run dev` and `bun run dev:mail` do, for the route tests. With TEST_APP=build, the route
 * tests talk to the built app in workerd instead. Each test file creates the organizations it
 * needs.
 */
export default async function setup(project: TestProject) {
	const url = project.config.env.DATABASE_URL;
	if (!url) {
		throw new Error('TEST_DATABASE_URL is not set; see .env.test');
	}

	await recreateDatabase(url);

	// The app runs in this process, so it needs the same environment the test files get
	Object.assign(process.env, project.config.env);
	// vite.config.ts has pointed both Workers' Hyperdrive at the test database and given the run a
	// registry of local Workers of its own

	// The mail Worker runs in workerd, as on Cloudflare; it handles the jobs the app queues
	const mailWorker = await createServer({
		root: 'workers/mail',
		mode: 'test',
		logLevel: 'error',
		server: { host: '127.0.0.1', port: 0, watch: null, hmr: false }
	});
	await mailWorker.listen();

	const app = process.env.TEST_APP === 'build' ? await startBuiltApp(project) : await startDevApp();
	project.provide('appUrl', app.url);

	return async () => {
		await app.close();
		await mailWorker.close();
		await rm(testRegistryPath, { recursive: true, force: true });
	};
}

interface RunningApp {
	url: string;
	close(): Promise<void>;
}

/** The app as `bun run dev` runs it: SvelteKit's dev server in this process */
async function startDevApp(): Promise<RunningApp> {
	const server = await createServer({
		configFile: 'vite.config.ts',
		mode: 'test',
		logLevel: 'error',
		server: { host: '127.0.0.1', port: 0, watch: null, hmr: false }
	});
	await server.listen();

	const address = server.httpServer?.address();
	if (!address || typeof address === 'string') {
		throw new Error('The app for the route tests did not start');
	}
	const url = `http://127.0.0.1:${address.port}`;
	// The app reads its URL when it starts, on the first request, which happens after this
	process.env.APP_URL = url;
	return { url, close: () => server.close() };
}

/**
 * The app as Cloudflare runs it: the build in .svelte-kit/cloudflare (`bun run build` first) in
 * workerd, through `wrangler dev`. CI runs the route tests this way too, set by TEST_APP=build.
 */
async function startBuiltApp(project: TestProject): Promise<RunningApp> {
	const port = await freePort();
	const url = `http://127.0.0.1:${port}`;
	const state = await mkdtemp(join(tmpdir(), 'keydesk-test-state-'));

	const wrangler = spawn(
		'bunx',
		['wrangler', 'dev', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', state],
		{
			// The secrets come from the environment (see `secrets` in wrangler.jsonc)
			env: { ...process.env, ...project.config.env, APP_URL: url },
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);
	let output = '';
	wrangler.stdout.on('data', (chunk) => (output += chunk));
	wrangler.stderr.on('data', (chunk) => (output += chunk));

	const deadline = Date.now() + 60_000;
	while (!(await answers(`${url}/login`))) {
		if (wrangler.exitCode !== null || Date.now() > deadline) {
			wrangler.kill();
			throw new Error(`The built app did not start:\n${output}`);
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}

	return {
		url,
		close: async () => {
			const exited = new Promise((resolve) => wrangler.once('exit', resolve));
			wrangler.kill();
			await exited;
			await rm(state, { recursive: true, force: true });
		}
	};
}

async function answers(url: string): Promise<boolean> {
	try {
		return (await fetch(url)).ok;
	} catch {
		return false;
	}
}

function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createNetServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			server.close(() =>
				typeof address === 'object' && address
					? resolve(address.port)
					: reject(new Error('No port'))
			);
		});
	});
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
}
