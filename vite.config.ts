import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// TEST_ variables come from .env.test locally and from the environment in CI
const testEnv = loadEnv('test', process.cwd(), 'TEST_');

/**
 * Set before any server starts: the SvelteKit adapter starts one local Cloudflare environment per
 * process (the first Vite server's, here Vitest's own) and the route tests' app uses that one.
 * Both Workers then reach the test database through their Hyperdrive binding, and find each other
 * through a registry of the run's own instead of one a development session uses.
 */
function useTestEnvironment() {
	process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE = testEnv.TEST_DATABASE_URL;
	process.env.MINIFLARE_REGISTRY_PATH = testRegistryPath;
	process.env.WRANGLER_REGISTRY_PATH = testRegistryPath;
}

/** The test run's registry of local Workers; test/global-setup.ts removes it afterwards */
export const testRegistryPath = join(tmpdir(), `keydesk-test-registry-${process.pid}`);

export default defineConfig(({ mode }) => {
	if (mode === 'test') useTestEnvironment();

	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				// Consult https://svelte.dev/docs/kit/integrations
				// for more information about preprocessors
				preprocess: vitePreprocess(),

				adapter: adapter({
					// Tests start from empty local storage and queues
					platformProxy: { persist: mode !== 'test' }
				})
			})
		],
		test: {
			include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
			environment: 'node',
			globalSetup: ['test/global-setup.ts'],
			env: {
				DATABASE_URL: testEnv.TEST_DATABASE_URL,
				ENCRYPTION_KEY: testEnv.TEST_ENCRYPTION_KEY,
				BETTER_AUTH_SECRET: testEnv.TEST_BETTER_AUTH_SECRET,
				LOG_LEVEL: 'warn'
			},
			// Test files share one database, so they run one after another
			fileParallelism: false,
			// A route test's first request makes the dev server compile that page, which can take
			// several seconds on a cold CI runner
			testTimeout: 30_000,
			hookTimeout: 30_000,
			expect: { requireAssertions: true }
		}
	};
});
