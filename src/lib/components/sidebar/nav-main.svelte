<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { ChevronRightIcon } from '@lucide/svelte';
	import type { User } from '$lib/types';
	import Ticket from '$lib/icons/ticket.svelte';
	import ViewAll from '$lib/icons/view-all.svelte';
	import ClipboardContent from '$lib/icons/clipboard-content.svelte';
	import Slider from '$lib/icons/slider.svelte';
	import Toggles from '$lib/icons/toggles.svelte';
	import { onMount } from 'svelte';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	const sidebar = useSidebar();

	let {
		user
	}: {
		user: User;
	} = $props();

	let openItem: string = $state('');
	onMount(() => {
		openItem = localStorage.getItem('openSidebarItem') ?? '';
	});
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<Sidebar.MenuButton tooltipContent="Dashboard" onclick={() => goto('/dashboard')}>
				<ViewAll />
				<span>Dashboard</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
		<Collapsible.Root
			open={openItem === 'Tickets'}
			onOpenChange={(isOpen) => {
				openItem = isOpen ? 'Tickets' : '';
				if (browser) localStorage.setItem('openSidebarItem', openItem);
			}}
			class="group/collapsible"
		>
			{#snippet child({ props })}
				<Sidebar.MenuItem {...props}>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props: tooltipProps })}
								<div
									{...tooltipProps}
									class="grid h-8 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md p-2 transition-[width,height,padding] duration-200 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:grid-cols-1 group-data-[collapsible=icon]:place-items-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-2 hover:bg-sidebar-accent"
								>
									<Ticket class="size-4 shrink-0" />
									<button
										class="min-w-0 truncate text-left group-data-[collapsible=icon]:hidden"
										onclick={() => goto('/dashboard/tickets')}
									>
										<span class="truncate text-sm">Tickets</span>
									</button>
									<button
										type="button"
										class="shrink-0 p-0 group-data-[collapsible=icon]:hidden"
										onclick={(e) => {
											e.stopPropagation();
											openItem = openItem === 'Tickets' ? '' : 'Tickets';
											if (browser) localStorage.setItem('openSidebarItem', openItem);
										}}
									>
										<ChevronRightIcon
											class="h-4 w-4 transition-transform duration-200 {openItem === 'Tickets'
												? 'rotate-90'
												: ''}"
										/>
									</button>
								</div>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content
							side="right"
							align="center"
							hidden={sidebar.state !== 'collapsed' || sidebar.isMobile}
						>
							Tickets
						</Tooltip.Content>
					</Tooltip.Root>
					<Collapsible.Content>
						<Sidebar.MenuSub>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="/dashboard/tickets?assignee={user.id}" {...props}>
											<span>My Tickets</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="/dashboard/tickets/all-tickets" {...props}>
											<span>All Tickets</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
						</Sidebar.MenuSub>
					</Collapsible.Content>
				</Sidebar.MenuItem>
			{/snippet}
		</Collapsible.Root>

		<Collapsible.Root
			open={openItem === 'Task List'}
			onOpenChange={(isOpen) => {
				openItem = isOpen ? 'Task List' : '';
				if (browser) localStorage.setItem('openSidebarItem', openItem);
			}}
			class="group/collapsible"
		>
			{#snippet child({ props })}
				<Sidebar.MenuItem {...props}>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props: tooltipProps })}
								<div
									{...tooltipProps}
									class="grid h-8 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md p-2 transition-[width,height,padding] duration-200 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:grid-cols-1 group-data-[collapsible=icon]:place-items-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-2 hover:bg-sidebar-accent"
								>
									<ClipboardContent class="size-4 shrink-0" />
									<button
										class="min-w-0 truncate text-left group-data-[collapsible=icon]:hidden"
										onclick={() => goto('/dashboard/tasks')}
									>
										<span class="truncate text-sm">Task List</span>
									</button>
									<button
										type="button"
										class="shrink-0 p-0 group-data-[collapsible=icon]:hidden"
										onclick={(e) => {
											e.stopPropagation();
											openItem = openItem === 'Task List' ? '' : 'Task List';
											if (browser) localStorage.setItem('openSidebarItem', openItem);
										}}
									>
										<ChevronRightIcon
											class="h-4 w-4 transition-transform duration-200 {openItem === 'Task List'
												? 'rotate-90'
												: ''}"
										/>
									</button>
								</div>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content
							side="right"
							align="center"
							hidden={sidebar.state !== 'collapsed' || sidebar.isMobile}
						>
							Task List
						</Tooltip.Content>
					</Tooltip.Root>
					<Collapsible.Content>
						<Sidebar.MenuSub>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="/dashboard/tasks?assignee={user.id}" {...props}>
											<span>My Tasks</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="/dashboard/tasks" {...props}>
											<span>Deleted Tasks</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
						</Sidebar.MenuSub>
					</Collapsible.Content>
				</Sidebar.MenuItem>
			{/snippet}
		</Collapsible.Root>
		<Sidebar.MenuItem>
			<Sidebar.MenuButton
				tooltipContent="Preferences"
				onclick={() => goto('/dashboard/preferences')}
			>
				<Toggles />
				<span>Preferences</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
		{#if user.role === 'admin'}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent="Settings" onclick={() => goto('/dashboard/settings')}>
					<Slider />
					<span>Settings</span>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		{/if}
	</Sidebar.Menu>
</Sidebar.Group>
