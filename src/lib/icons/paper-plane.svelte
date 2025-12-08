<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'M14.9298 1.83569C15.8387 1.51064 16.7542 2.2945 16.5796 3.24022L14.3836 15.1001C14.2158 16.0073 13.1545 16.428 12.4112 15.8781L2.30823 8.41014C1.50269 7.81474 1.68979 6.56564 2.63017 6.2289L14.9298 1.83569Z',
				'fill-rule': 'evenodd',
				'clip-rule': 'evenodd',
				'fill-opacity': '0.4'
			}
		],
		[
			'path',
			{
				d: 'M6.4665 11.484L4.99823 10.3987L16.151 2.19983L6.4665 11.484Z'
			}
		],
		[
			'path',
			{
				d: 'M5 10.3998V14.268C5 15.289 6.15975 15.8804 6.98634 15.2776L9.30505 13.5821L5 10.3998Z'
			}
		]
	];
</script>

<Icon name="paper-plane" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
