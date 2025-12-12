<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'rect',
			{
				x: '8.25',
				y: '3.25',
				width: '1.5',
				height: '11.5',
				rx: '0.75'
			}
		],
		[
			'rect',
			{
				x: '3.25',
				y: '8.25',
				width: '11.5',
				height: '1.5',
				rx: '0.75'
			}
		]
	];
</script>

<Icon name="plus" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
