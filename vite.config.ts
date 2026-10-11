import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// TEST_ variables come from .env.test locally and from the environment in CI
const testEnv = loadEnv('test', process.cwd(), 'TEST_');

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		globalSetup: ['test/global-setup.ts'],
		env: {
			DATABASE_URL: testEnv.TEST_DATABASE_URL,
			ENCRYPTION_KEY: testEnv.TEST_ENCRYPTION_KEY
		},
		// Test files share one database, so they run one after another
		fileParallelism: false,
		expect: { requireAssertions: true }
	}
});
