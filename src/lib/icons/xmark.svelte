<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'M14 4L4 14'
			}
		],
		[
			'path',
			{
				d: 'M4 4L14 14'
			}
		]
	];
</script>

<Icon name="xmark" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
