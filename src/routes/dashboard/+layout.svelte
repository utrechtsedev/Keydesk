<script lang="ts">
	import AppSidebar from '$lib/components/sidebar/app-sidebar.svelte';
	import TopNavbar from '$lib/components/sidebar/top-navbar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { PageData } from '$lib/types';
	import { onMount, type Snippet } from 'svelte';

	let {
		children,
		data
	}: {
		children: Snippet;
		data: PageData;
	} = $props();

	let open = $state(true);

	onMount(() => {
		open = JSON.parse(localStorage.getItem('sidebarOpen') ?? 'true');
	});
</script>

<Sidebar.Provider bind:open>
	<AppSidebar user={data.user} session={data.session} organization={data.organization} />
	<Sidebar.Inset class="flex min-w-0 flex-col">
		<TopNavbar initialNotifications={data.notifications} />
		<div class="max-w-full min-w-full p-4">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
