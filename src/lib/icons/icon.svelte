<script lang="ts">
	import defaultAttributes from '$lib/icons/defaultAttributes';
	import { cn } from '$lib/utils';

	const {
		name,
		color = '#212121',
		size = 24,
		iconNode = [],
		children,
		class: className,
		...props
	} = $props();
</script>

<svg
	{...defaultAttributes}
	{...props}
	width={size}
	height={size}
	fill={color}
	class={cn('dark:invert', name, className)}
	viewBox="0 0 18 18"
>
	{#each iconNode as [tag, attrs], i (i)}
		<svelte:element this={tag} {...attrs} />
	{/each}
	{@render children?.()}
</svg>
