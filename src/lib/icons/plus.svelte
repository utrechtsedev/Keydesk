<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'm10.75,6.75H1.25c-.414,0-.75-.336-.75-.75s.336-.75.75-.75h9.5c.414,0,.75.336.75.75s-.336.75-.75.75Z'
			}
		],
		[
			'path',
			{
				d: 'm6,11.5c-.414,0-.75-.336-.75-.75V1.25c0-.414.336-.75.75-.75s.75.336.75.75v9.5c0,.414-.336.75-.75.75Z'
			}
		]
	];
</script>

<Icon name="plus" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
