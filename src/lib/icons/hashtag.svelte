<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'M12.0411 6.26082H6.98894L5.94986 11.7608H11.0199L12.0411 6.26082Z',
				fill: '#212121',
				'fill-opacity': '0.3',
				stroke: 'none'
			}
		],
		[
			'path',
			{
				d: 'M3.75 6.25H15.25',
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
				d: 'M2.75 11.75H14.25',
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
				d: 'M7.633 2.75L5.289 15.25',
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
				d: 'M12.711 2.75L10.367 15.25',
				fill: 'none',
				stroke: '#212121',
				'stroke-width': '1.5',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			}
		]
	];
</script>

<Icon name="hashtag" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
