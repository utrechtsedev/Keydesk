<script>
	import { cn } from '$lib/utils';

	const { size = '18', class: className } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	class={cn('dark:invert', className)}
	viewBox="0 0 18 18"
	><title>xmark</title><g
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
		stroke="#212121"><path d="M14 4L4 14"></path> <path d="M4 4L14 14"></path></g
	></svg
>
