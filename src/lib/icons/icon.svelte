<script lang="ts">
	import defaultAttributes from '$lib/icons/defaultAttributes';

	const {
		name,
		color = '#212121',
		size = 24,
		absoluteStrokeWidth = false,
		iconNode = [],
		children,
		...props
	} = $props();
</script>

<svg
	{...defaultAttributes}
	{...props}
	width={size}
	height={size}
	fill={color}
	class={['dark:invert', name, props.class]}
	viewBox="0 0 18 18"
>
	{#each iconNode as [tag, attrs]}
		<svelte:element this={tag} {...attrs} />
	{/each}
	{@render children?.()}
</svg>
