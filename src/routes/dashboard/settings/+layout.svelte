<script>
	import * as Card from '$lib/components/ui/card';
	import * as Item from '$lib/components/ui/item';
	import { page } from '$app/state';
	import Organization from '$lib/icons/organization.svelte';
	import Email from '$lib/icons/email.svelte';
	import GridSquareCirclePlus from '$lib/icons/grid-square-circle-plus.svelte';
	import InboxArrowUp from '$lib/icons/inbox-arrow-up.svelte';
	import UmbrellaBeach from '$lib/icons/umbrella-beach.svelte';
	const { children } = $props();
	const routes = [
		{
			path: '/dashboard/settings/organization',
			name: 'Organization',
			icon: Organization
		},
		{
			path: '/dashboard/settings/outgoing-email',
			name: 'Outgoing Email',
			icon: InboxArrowUp
		},
		{
			path: '/dashboard/settings/incoming-email',
			name: 'Incoming Email',
			icon: Email
		},
		{
			path: '/dashboard/settings/portal',
			name: 'Portal',
			icon: GridSquareCirclePlus
		},
		{
			path: '/dashboard/settings/holidays',
			name: 'Holidays',
			icon: UmbrellaBeach
		}
	];
</script>

<div class="flex flex-col gap-4 md:flex-row">
	<Card.Root class="w-full self-start p-0 md:w-auto md:max-w-[300px] md:min-w-[250px]">
		<Card.Content class="flex h-full p-0">
			<div class="w-full space-y-2 py-4">
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
		</Card.Content>
	</Card.Root>
	<Card.Root class="w-full flex-1 py-4">
		<Card.Content class="p-0">
			<div class="overflow-y-auto">
				{@render children()}
			</div>
		</Card.Content>
	</Card.Root>
</div>
