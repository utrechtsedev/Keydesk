<script>
	import Icon from './icon.svelte';
	let props = $props();
	const iconNode = [
		[
			'path',
			{
				d: 'M9.53,4.72c-.293-.293-.768-.293-1.061,0L2.22,10.97c-.293,.293-.293,.768,0,1.061s.768,.293,1.061,0l5.72-5.72,5.72,5.72c.146,.146,.338,.22,.53,.22s.384-.073,.53-.22c.293-.293,.293-.768,0-1.061l-6.25-6.25Z',
				fill: '#212121'
			}
		]
	];
</script>

<Icon name="chevron-up" {...props} {iconNode}>
	{@render props.children?.()}
</Icon>
