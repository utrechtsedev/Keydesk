<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Office3 from '$lib/icons/office-3.svelte';
	import type { Organization } from '$lib/types';

	let { organization }: { organization: Organization } = $props();
</script>

<Sidebar.MenuButton
	size="lg"
	class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
>
	<div
		class="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-sidebar-primary-foreground"
	>
		<Office3 />
	</div>
	<div class="grid flex-1 text-left text-sm leading-tight">
		<span class="truncate font-medium">
			{organization.name}
		</span>
		<span class="truncate text-xs">Keydesk</span>
	</div>
</Sidebar.MenuButton>
