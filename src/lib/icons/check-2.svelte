<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'M2.75 9.5L6.5 13.25L15.25 4.5'
			}
		]
	];
</script>

<Icon name="check-2" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
