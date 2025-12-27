<script lang="ts">
	import Loader6 from '$lib/icons/loader-6.svelte';
	import { cn } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let { class: className, ...restProps }: ComponentProps<typeof Loader6> = $props();
</script>

<Loader6
	role="status"
	aria-label="Loading"
	class={cn('size-4 animate-spin', className)}
	{...restProps}
/>
