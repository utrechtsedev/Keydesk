<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'circle',
			{
				cx: '12',
				cy: '12',
				r: '10',
				fill: '#212121'
			}
		]
	];
</script>

<Icon name="circle" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
