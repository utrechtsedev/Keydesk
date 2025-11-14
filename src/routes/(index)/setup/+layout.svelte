<script>
	import * as Card from '$lib/components/ui/card';
	import * as Item from '$lib/components/ui/item';
	import { page } from '$app/state';
	import Organization from '$lib/icons/organization.svelte';
	import Email from '$lib/icons/email.svelte';
	import GridSquareCirclePlus from '$lib/icons/grid-square-circle-plus.svelte';
	import UsersSparkle from '$lib/icons/users-sparkle.svelte';
	import InboxArrowUp from '$lib/icons/inbox-arrow-up.svelte';
	const { children } = $props();

	const routes = [
		{
			path: '/setup/organization',
			name: 'Organization',
			icon: Organization
		},
		{
			path: '/setup/outgoing-email',
			name: 'Outgoing Email',
			icon: InboxArrowUp
		},
		{
			path: '/setup/incoming-email',
			name: 'Incoming Email',
			icon: Email
		},
		{
			path: '/setup/portal',
			name: 'Portal',
			icon: GridSquareCirclePlus
		},

		{
			path: '/setup/admin-account',
			name: 'Finish',
			icon: UsersSparkle
		}
	];
</script>

<div
	class="bg-setup flex h-[100dvh] w-full items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 dark:from-neutral-950 dark:to-blue-950"
>
	<Card.Root class="h-[80dvh] w-8/12 border-none p-0 shadow-2xl">
		<Card.Content class="flex h-full p-0">
			<div class="w-64 space-y-2 border-r py-4">
				{#each routes as route}
					<a href={route.path}>
						<Item.Root
							class="mx-4 rounded-2xl px-1 py-2 {page.url.pathname === route.path
								? 'bg-muted'
								: ''}"
							variant={page.url.pathname === route.path ? 'outline' : 'default'}
						>
							<Item.Media
								class="ml-1 {page.url.pathname === route.path
									? 'rounded-md border bg-input shadow-xl'
									: ''} p-2"
							>
								<route.icon />
							</Item.Media>
							<Item.Content>
								<Item.Title>{route.name}</Item.Title>
							</Item.Content>
						</Item.Root>
					</a>
				{/each}
			</div>
			<div class="flex-1 overflow-y-auto py-4">
				{@render children()}
			</div>
		</Card.Content>
	</Card.Root>
</div>
