<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	// This should be `Component` after @lucide/svelte updates types
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { teams }: { teams: { name: string; logo: any; plan: string }[] } = $props();
	let activeTeam = $state(teams[0]);
</script>

<Sidebar.MenuButton
	size="lg"
	class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
>
	<div
		class="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-sidebar-primary-foreground"
	>
		<activeTeam.logo class="size-4" />
	</div>
	<div class="grid flex-1 text-left text-sm leading-tight">
		<span class="truncate font-medium">
			{activeTeam.name}
		</span>
		<span class="truncate text-xs">{activeTeam.plan}</span>
	</div>
</Sidebar.MenuButton>
