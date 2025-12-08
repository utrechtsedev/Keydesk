<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'circle',
			{
				cx: '10.75',
				cy: '10.25',
				r: '4',
				fill: '#212121',
				opacity: '0.3'
			}
		],
		[
			'line',
			{
				x1: '1.75',
				y1: '11.25',
				x2: '3.8217',
				y2: '11.25'
			}
		],
		[
			'line',
			{
				x1: '1.75',
				y1: '7.25',
				x2: '4.4266',
				y2: '7.25'
			}
		],
		[
			'line',
			{
				x1: '1.75',
				y1: '3.25',
				x2: '12.25',
				y2: '3.25'
			}
		],
		[
			'circle',
			{
				cx: '10.75',
				cy: '10.25',
				r: '4'
			}
		],
		[
			'line',
			{
				x1: '13.5784',
				y1: '13.0784',
				x2: '16.25',
				y2: '15.75'
			}
		]
	];
</script>

<Icon name="search-content-2" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
