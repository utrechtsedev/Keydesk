<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'm12.25,13.25h-1.25c-1.5166,0-2.75-1.2334-2.75-2.75v-3.25c0-.6895-.5605-1.25-1.25-1.25h-1.25c-.4141,0-.75-.3359-.75-.75s.3359-.75.75-.75h1.25c1.5166,0,2.75,1.2334,2.75,2.75v3.25c0,.6895.5605,1.25,1.25,1.25h1.25c.4141,0,.75.3359.75.75s-.3359.75-.75.75Z',
				opacity: '0.4'
			}
		],
		[
			'circle',
			{
				cx: '3.5',
				cy: '5.25',
				r: '2.5'
			}
		],
		[
			'circle',
			{
				cx: '14.5',
				cy: '12.75',
				r: '2.5'
			}
		]
	];
</script>

<Icon name="connection-2" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
