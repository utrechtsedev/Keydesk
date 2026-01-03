<script lang="ts">
	import Xmark from '$lib/icons/xmark.svelte';
	import type { Tag, NewTag } from '$lib/types';

	type Props = {
		tag: Tag | NewTag; // Changed from value: string
		disabled: boolean | null;
		active: boolean;
		onDelete: (tag: Tag | NewTag) => void; // Changed parameter type
	};

	let { tag, disabled, onDelete, active }: Props = $props();
</script>

<div
	class="flex place-items-center gap-2 rounded-md bg-secondary px-2 py-0.5 ring-offset-background transition-all hover:cursor-default hover:bg-secondary/90 aria-selected:bg-secondary/90 aria-selected:ring-2 aria-selected:ring-ring aria-selected:ring-offset-2"
	aria-selected={active}
>
	<span class="text-sm">
		{tag.name}
	</span>
	<button type="button" {disabled} onclick={() => onDelete(tag)}>
		<Xmark class="size-4" />
	</button>
</div>
