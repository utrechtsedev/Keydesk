<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Props = HTMLTextareaAttributes & {
		ref?: HTMLTextAreaElement | null;
		value?: string;
		class?: string;
		'data-slot'?: string;
		children?: Snippet;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		children,
		...restProps
	}: Props = $props();

	function autoResize(node: HTMLTextAreaElement) {
		function resize() {
			node.style.height = 'auto';
			node.style.height = node.scrollHeight + 'px';
		}

		// Only listen to input event - no loops
		node.addEventListener('input', resize);

		// Initial resize
		setTimeout(resize, 0);

		return {
			destroy() {
				node.removeEventListener('input', resize);
			}
		};
	}
</script>

<div class="relative">
	<textarea
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'flex min-h-36 w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 pb-12 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 supports-[field-sizing:content]:field-sizing-content md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
			className
		)}
		bind:value
		use:autoResize
		{...restProps}
	></textarea>

	{#if children}
		<div class="pointer-events-none absolute right-3 bottom-2 left-3">
			<div class="pointer-events-auto">
				{@render children()}
			</div>
		</div>
	{/if}
</div>
