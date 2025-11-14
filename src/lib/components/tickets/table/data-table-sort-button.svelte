<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpDownIcon } from '@lucide/svelte';

	let {
		variant = 'link',
		text,
		...restProps
	}: ComponentProps<typeof Button> & { text: string } = $props();
</script>

<Button {variant} {...restProps} class="group transition-all">
	{text}
	<ArrowUpDownIcon class="ml-2 opacity-0 group-hover:opacity-100" />
</Button>
