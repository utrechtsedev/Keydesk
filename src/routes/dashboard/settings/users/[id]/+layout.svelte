<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as UnderlineTabs from '#lib/components/ui/underline-tabs/index.js';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();

	// The user being managed, not the signed-in admin
	const basePath = $derived(`/dashboard/settings/users/${page.params.id}`);

	// Determine current tab from URL
	const currentTab = $derived(() => {
		const path = page.url.pathname;
		if (path.endsWith('/account')) return 'account';
		if (path.endsWith('/tickets')) return 'tickets';
		if (path.endsWith('/tasks')) return 'tasks';
		return 'account';
	});
</script>

<div class="relative w-full">
	<UnderlineTabs.Root value={currentTab()}>
		<UnderlineTabs.List class="flex w-full justify-around">
			<UnderlineTabs.Trigger onclick={() => goto(`${basePath}/account`)} value="account">
				Account
			</UnderlineTabs.Trigger>
			<UnderlineTabs.Trigger onclick={() => goto(`${basePath}/tickets`)} value="tickets">
				Tickets
			</UnderlineTabs.Trigger>
			<UnderlineTabs.Trigger onclick={() => goto(`${basePath}/tasks`)} value="tasks">
				Tasks
			</UnderlineTabs.Trigger>
		</UnderlineTabs.List>
	</UnderlineTabs.Root>

	{@render children()}
</div>
