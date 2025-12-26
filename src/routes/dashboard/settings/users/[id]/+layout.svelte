<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as UnderlineTabs from '$lib/components/ui/underline-tabs';
	import type { PageData } from '$lib/types';
	import type { Snippet } from 'svelte';

	const { data, children }: { data: PageData; children: Snippet } = $props();

	const userId = data.user.id;
	const basePath = `/dashboard/settings/users/${userId}`;

	// Determine current tab from URL
	const currentTab = $derived(() => {
		const path = page.url.pathname;
		if (path.endsWith('/account')) return 'account';
		if (path.endsWith('/tickets')) return 'tickets';
		if (path.endsWith('/tasks')) return 'tasks';
		if (path.endsWith('/manage')) return 'manage';
		if (path.endsWith('/logs')) return 'logs';
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
			<UnderlineTabs.Trigger onclick={() => goto(`${basePath}/manage`)} value="manage">
				Manage
			</UnderlineTabs.Trigger>
			<UnderlineTabs.Trigger onclick={() => goto(`${basePath}/logs`)} value="logs">
				Logs
			</UnderlineTabs.Trigger>
		</UnderlineTabs.List>
	</UnderlineTabs.Root>

	{@render children()}
</div>
