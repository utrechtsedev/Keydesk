<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'rect',
			{
				x: '3',
				y: '3',
				width: '12',
				height: '12',
				rx: '2',
				fill: '#212121',
				'fill-opacity': '0.3',
				stroke: 'none'
			}
		],
		[
			'path',
			{
				d: 'M14.25 15.25H4.75C3.645 15.25 2.75 14.355 2.75 13.25V3.75',
				fill: 'none',
				stroke: '#212121',
				'stroke-width': '1.5',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			}
		],
		[
			'path',
			{
				d: 'M9.73999 2.75H15.25V8.26',
				fill: 'none',
				stroke: '#212121',
				'stroke-width': '1.5',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			}
		],
		[
			'path',
			{
				d: 'M15.25 2.75L7.75 10.25',
				fill: 'none',
				stroke: '#212121',
				'stroke-width': '1.5',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			}
		]
	];
</script>

<Icon name="arrow-from-corner-up-right" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
