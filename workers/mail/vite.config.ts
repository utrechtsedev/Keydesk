import { cloudflare } from '@cloudflare/vite-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	// Its own dependency cache: sharing the app's, the two dev servers would keep invalidating
	// each other's (the Svelte plugin keeps one metadata file per cache)
	cacheDir: '../../node_modules/.vite-mail',
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
