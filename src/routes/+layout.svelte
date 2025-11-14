<script>
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';
	const { children } = $props();
	import '@fontsource-variable/figtree';
	import '../app.css';
</script>

{@render children()}
<Toaster richColors />
<ModeWatcher defaultMode="light" />
