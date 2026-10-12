import { cloudflare } from '@cloudflare/vite-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [
		// Compiles the email templates, which are Svelte components
		svelte(),
		cloudflare({
			configPath: './wrangler.jsonc',
			// Tests start from an empty queue
			persistState: mode !== 'test'
		})
	]
}));
