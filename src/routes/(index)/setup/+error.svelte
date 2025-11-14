<script>
	import SquareDashedTextXmark from '$lib/icons/square-dashed-text-xmark.svelte';
</script>

<div class="flex h-full flex-col items-center justify-center">
	<SquareDashedTextXmark size={60} />
	<h1 class="text-2xl font-extrabold">Database Error</h1>
	<span>Please check your .env file, and seed the database.</span>
</div>
