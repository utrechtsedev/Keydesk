<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'circle',
			{
				cx: '6.75',
				cy: '9',
				r: '.5',
				fill: '#212121'
			}
		],
		[
			'circle',
			{
				cx: '6.75',
				cy: '3.75',
				r: '.5',
				fill: '#212121'
			}
		],
		[
			'circle',
			{
				cx: '6.75',
				cy: '14.25',
				r: '.5',
				fill: '#212121'
			}
		],
		[
			'circle',
			{
				cx: '11.25',
				cy: '9',
				r: '.5',
				fill: '#212121'
			}
		],
		[
			'circle',
			{
				cx: '11.25',
				cy: '3.75',
				r: '.5',
				fill: '#212121'
			}
		],
		[
			'circle',
			{
				cx: '11.25',
				cy: '14.25',
				r: '.5',
				fill: '#212121'
			}
		]
	];
</script>

<Icon name="grip-dots-vertical" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
