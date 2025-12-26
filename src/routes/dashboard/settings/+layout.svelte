<script>
	import * as Card from '$lib/components/ui/card';
	import { page } from '$app/state';
	import Organization from '$lib/icons/organization.svelte';
	import Email from '$lib/icons/email.svelte';
	import GridSquareCirclePlus from '$lib/icons/grid-square-circle-plus.svelte';
	import InboxArrowUp from '$lib/icons/inbox-arrow-up.svelte';
	import FileClip from '$lib/icons/file-clip.svelte';
	import SuitcaseClock from '$lib/icons/suitcase-clock.svelte';
	import UmbrellaBeach from '$lib/icons/umbrella-beach.svelte';
	import Grid2 from '$lib/icons/grid-2.svelte';
	import BellDot from '$lib/icons/bell-dot.svelte';
	import PriorityMedium2 from '$lib/icons/priority-medium-2.svelte';
	import Wip from '$lib/icons/wip.svelte';
	import Ticket from '$lib/icons/ticket.svelte';
	import People from '$lib/icons/people.svelte';

	const { children } = $props();

	const routes = [
		{
			path: '/dashboard/settings/organization',
			name: 'Organization',
			icon: Organization
		},
		{
			path: '/dashboard/settings/users',
			name: 'Users',
			icon: People
		},
		{
			path: '/dashboard/settings/tickets',
			name: 'Tickets',
			icon: Ticket
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
			path: '/dashboard/settings/attachments',
			name: 'Attachments',
			icon: FileClip
		},
		{
			path: '/dashboard/settings/notifications',
			name: 'Notifications',
			icon: BellDot
		},
		{
			path: '/dashboard/settings/business-hours',
			name: 'Business Hours',
			icon: SuitcaseClock
		},
		{
			path: '/dashboard/settings/holidays',
			name: 'Holidays',
			icon: UmbrellaBeach
		},
		{
			path: '/dashboard/settings/priorities',
			name: 'Priorities',
			icon: PriorityMedium2
		},
		{
			path: '/dashboard/settings/statuses',
			name: 'Statuses',
			icon: Wip
		},
		{
			path: '/dashboard/settings/categories',
			name: 'Categories',
			icon: Grid2
		}
	];
</script>

<div class="flex flex-col gap-4 md:flex-row">
	<Card.Root class="w-full self-start md:w-auto md:max-w-75 md:min-w-62.5">
		<Card.Content class="px-3">
			<nav class="space-y-1">
				{#each routes as route, i (i)}
					{@const isActive = page.url.pathname === route.path}
					<a
						href={route.path}
						class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground {isActive
							? 'bg-accent text-accent-foreground'
							: 'text-muted-foreground'}"
					>
						<route.icon class="h-5 w-5" />
						<span class="font-bold">{route.name}</span>
					</a>
				{/each}
			</nav>
		</Card.Content>
	</Card.Root>

	<Card.Root class="w-full flex-1">
		<Card.Content class="p-0">
			{@render children()}
		</Card.Content>
	</Card.Root>
</div>
