<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'circle',
			{
				cx: '9',
				cy: '9',
				r: '1.25',
				fill: '#212121'
			}
		],
		[
			'circle',
			{
				cx: '3.25',
				cy: '9',
				r: '1.25',
				fill: '#212121'
			}
		],
		[
			'circle',
			{
				cx: '14.75',
				cy: '9',
				r: '1.25',
				fill: '#212121'
			}
		]
	];
</script>

<Icon name="dots" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
