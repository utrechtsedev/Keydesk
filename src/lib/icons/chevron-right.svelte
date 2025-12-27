<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'M13.28,8.47L7.03,2.22c-.293-.293-.768-.293-1.061,0s-.293,.768,0,1.061l5.72,5.72-5.72,5.72c-.293,.293-.293,.768,0,1.061,.146,.146,.338,.22,.53,.22s.384-.073,.53-.22l6.25-6.25c.293-.293,.293-.768,0-1.061Z',
				fill: '#212121'
			}
		]
	];
</script>

<Icon name="chevron-right" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
