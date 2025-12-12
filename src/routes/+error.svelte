<!-- src/routes/+error.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	const { status, error } = $derived({
		status: page.status,
		error: page.error
	});

	const message = $derived(error?.message || 'An unexpected error occurred');

	const errorTitles: Record<number, string> = {
		400: 'Bad Request',
		401: 'Unauthorized',
		403: 'Forbidden',
		404: 'Page Not Found',
		500: 'Server Error',
		503: 'Service Unavailable'
	};

	const title = $derived(errorTitles[status] || 'Error');
</script>

<div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
	<div class="flex flex-col items-center justify-center px-4 py-8 text-center">
		<h2 class="mb-6 text-5xl font-semibold">Whoops!</h2>
		<h3 class="mb-1.5 text-3xl font-semibold">Something went wrong</h3>
		<p class="mb-6 max-w-sm text-muted-foreground">
			The page you&apos;re looking for isn&apos;t found, we suggest you back to home.
		</p>
		<Button size="lg" class="rounded-lg text-base">
			<a href="/">Back to home page</a>
		</Button>
	</div>

	<div class="relative max-h-screen w-full p-2 max-lg:hidden">
		<div class="h-full w-full rounded-2xl bg-black"></div>
	</div>
</div>
