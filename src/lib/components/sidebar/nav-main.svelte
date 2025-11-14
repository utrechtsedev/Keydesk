<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { ChevronRightIcon } from '@lucide/svelte';
	import type { User } from '$lib/types';
	import Ticket from '$lib/icons/ticket.svelte';
	import ViewAll from '$lib/icons/view-all.svelte';
	import ClipboardContent from '$lib/icons/clipboard-content.svelte';
	import Slider from '$lib/icons/slider.svelte';

	let {
		user
	}: {
		user: User;
	} = $props();

	let openItem = $state(browser ? (localStorage.getItem('openSidebarItem') ?? '') : '');
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
	<Sidebar.Menu>
		<!-- Dashboard -->
		<Collapsible.Root>
			{#snippet child({ props })}
				<Sidebar.MenuItem {...props}>
					<Sidebar.MenuButton tooltipContent="Dashboard" onclick={() => goto('/dashboard')}>
						<ViewAll />
						<span>Dashboard</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/snippet}
		</Collapsible.Root>

		<!-- Tickets -->
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
					<Sidebar.MenuButton tooltipContent="Tickets" onclick={() => goto('/dashboard/tickets')}>
						<Ticket />
						<span>Tickets</span>
						<Collapsible.Trigger
							class="ml-auto p-0 group-data-[collapsible=icon]/sidebar-wrapper:hidden"
						>
							<ChevronRightIcon
								class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
							/>
						</Collapsible.Trigger>
					</Sidebar.MenuButton>
					<Collapsible.Content>
						<Sidebar.MenuSub>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="/dashboard/tickets/my-tickets" {...props}>
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

		<!-- Task List -->
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
					<Sidebar.MenuButton tooltipContent="Task List" onclick={() => goto('/dashboard/tasks')}>
						<ClipboardContent />
						<span>Task List</span>
						<Collapsible.Trigger
							class="ml-auto p-0 group-data-[collapsible=icon]/sidebar-wrapper:hidden"
						>
							<ChevronRightIcon
								class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
							/>
						</Collapsible.Trigger>
					</Sidebar.MenuButton>
					<Collapsible.Content>
						<Sidebar.MenuSub>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="/dashboard/tasks/my-tasks" {...props}>
											<span>My Tasks</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="#" {...props}>
											<span>All Due Tasks</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="#" {...props}>
											<span>Unassigned Tasks</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									{#snippet child({ props })}
										<a href="#" {...props}>
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

		<!-- Settings -->
		{#if user.role === 'admin'}
			<Collapsible.Root>
				{#snippet child({ props })}
					<Sidebar.MenuItem {...props}>
						<Sidebar.MenuButton
							tooltipContent="Settings"
							onclick={() => goto('/dashboard/settings')}
						>
							<Slider />
							<span>Settings</span>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/snippet}
			</Collapsible.Root>
		{/if}
	</Sidebar.Menu>
</Sidebar.Group>
