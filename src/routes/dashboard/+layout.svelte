<script lang="ts">
	import AppSidebar from '$lib/components/sidebar/app-sidebar.svelte';
	import TopNavbar from '$lib/components/sidebar/top-navbar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { browser } from '$app/environment';
	import type { User, UserNotification } from '$lib/types';
	import type { Snippet } from 'svelte';

	let {
		children,
		data
	}: {
		children: Snippet;
		data: {
			user: User;
			notifications: UserNotification[];
		};
	} = $props();
	let open = $state(browser ? JSON.parse(localStorage.getItem('sidebarOpen') ?? 'true') : true);
</script>

<Sidebar.Provider bind:open>
	<AppSidebar user={data.user} />
	<Sidebar.Inset class="flex min-w-0 flex-col">
		<TopNavbar initialNotifications={data.notifications} />
		<div class="max-w-full min-w-full p-4">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
