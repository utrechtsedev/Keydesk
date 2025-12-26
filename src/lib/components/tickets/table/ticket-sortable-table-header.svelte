<script lang="ts">
	import { useSortable } from '@dnd-kit-svelte/sortable';
	import { CSS, styleObjectToString } from '@dnd-kit-svelte/utilities';
	import type { Snippet } from 'svelte';
	import GripVertical from '$lib/icons/grip-dots-vertical.svelte';

	let {
		id,
		children
	}: {
		id: string;
		children: Snippet;
	} = $props();

	const { attributes, listeners, node, transform, transition, isDragging, isSorting, setActivatorNodeRef } =
		useSortable({ id });

	const style = $derived(
		styleObjectToString({
			transform: CSS.Transform.toString(transform.current),
			transition: isSorting.current ? transition.current : undefined,
			zIndex: isDragging.current ? 1 : undefined
		})
	);

	// Local ref for activator
	let activatorNode = $state<HTMLElement | null>(null);

	// Set the activator ref when it changes
	$effect(() => {
		setActivatorNodeRef(activatorNode);
	});
</script>

<th
	bind:this={node.current}
	{style}
	class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 group relative"
	class:opacity-50={isDragging.current}
>
	<div class="flex items-center gap-2">
		<div class="flex-1">
			{@render children()}
		</div>
		<button
			{...attributes.current}
			bind:this={activatorNode}
			{...listeners.current}
			class="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
			onclick={(e: MouseEvent) => e.stopPropagation()}
			type="button"
		>
			<GripVertical class="h-4 w-4" />
		</button>

	</div>
</th>
