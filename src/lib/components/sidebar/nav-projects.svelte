<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ArrowFromCornerUpRight from '$lib/icons/arrow-from-corner-up-right.svelte';
	import Dots from '$lib/icons/dots.svelte';
	import Folder from '$lib/icons/folder.svelte';
	import Trash2 from '$lib/icons/trash-2.svelte';
	let {
		projects
	}: {
		projects: {
			name: string;
			url: string;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			icon: any;
		}[];
	} = $props();
	const sidebar = useSidebar();
</script>

<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
	<Sidebar.GroupLabel>Projects</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each projects as item (item.name)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					{#snippet child({ props })}
						<a href={item.url} {...props}>
							<item.icon />
							<span>{item.name}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuAction showOnHover {...props}>
								<Dots />
								<span class="sr-only">More</span>
							</Sidebar.MenuAction>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-48 rounded-lg"
						side={sidebar.isMobile ? 'bottom' : 'right'}
						align={sidebar.isMobile ? 'end' : 'start'}
					>
						<DropdownMenu.Item>
							<Folder class="text-muted-foreground" />
							<span>View Project</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<ArrowFromCornerUpRight class="text-muted-foreground" />
							<span>Share Project</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>
							<Trash2 class="text-muted-foreground" />
							<span>Delete Project</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		{/each}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton class="text-sidebar-foreground/70">
				<Dots class="text-sidebar-foreground/70" />
				<span>More</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>
