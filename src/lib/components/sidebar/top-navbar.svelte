<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Popover from '$lib/components/ui/popover';
	import * as Empty from '$lib/components/ui/empty';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import BellOn from '$lib/icons/bell-on.svelte';
	import GridSearch from '$lib/icons/grid-search.svelte';
	import VShapedArrowRight from '$lib/icons/v-shaped-arrow-right.svelte';
	import BellDot from '$lib/icons/bell-dot.svelte';
	import { goto } from '$app/navigation';
	import type { UserNotification } from '$lib/types';
	import api from '$lib/utils/axios';

	let { initialNotifications }: { initialNotifications: UserNotification[] } = $props();

	let notifications = $state(initialNotifications);

	let isPopoverOpen = $state(false);
	const unreadCount = $derived(notifications.filter((n) => !n.isRead).length);

	async function handleMarkAllAsRead() {
		const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

		if (unreadIds.length === 0) return;

		await api.patch('/api/notifications/bulk', {
			ids: unreadIds
		});

		notifications = notifications.map((n) => {
			if (unreadIds.includes(n.id)) {
				n.isRead = true;
				n.readAt = new Date();
			}
			return n;
		});
	}
	async function handleNotificationClick(notification: UserNotification) {
		const actionUrl = notification.notification!.actionUrl;

		try {
			await api.patch('/api/notifications', {
				id: notification.id,
				isRead: true
			});

			notifications = notifications.map((n) => {
				if (n.id === notification.id) {
					n.isRead = true;
					n.readAt = new Date();
				}
				return n;
			});
		} finally {
			if (actionUrl) {
				goto(actionUrl);
				isPopoverOpen = false;
			}
		}
	}
</script>

{#snippet Dot(className = '')}
	<svg
		width="6"
		height="6"
		fill="currentColor"
		viewBox="0 0 6 6"
		xmlns="http://www.w3.org/2000/svg"
		class={className}
		aria-hidden="true"
	>
		<circle cx="3" cy="3" r="3" />
	</svg>
{/snippet}

<header
	class="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
>
	<!-- Left side -->
	<div class="flex items-center gap-2 px-4">
		<Sidebar.Trigger
			class="-ml-1"
			onclick={() => {
				const isOpen = JSON.parse(localStorage.getItem('sidebarOpen') ?? 'true');
				localStorage.setItem('sidebarOpen', JSON.stringify(!isOpen));
			}}
		/>
		<Separator orientation="vertical" class="mr-2 h-4" />
	</div>

	<!-- Center (Search) -->
	<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
		<div class="relative w-80">
			<Input class="w-full justify-center pr-10" />
			<div class="absolute inset-y-0 right-0 flex items-center pr-3">
				<GridSearch />
			</div>
		</div>
	</div>

	<div class="flex items-center gap-2 px-4">
		<Popover.Root bind:open={isPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<div class="relative inline-block">
						<Button size="icon" variant="outline" aria-label="Open notifications" {...props}>
							<BellDot />
						</Button>
						{#if unreadCount > 0}
							<Badge
								class="pointer-events-none absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1"
							>
								{unreadCount > 99 ? '99+' : unreadCount}
							</Badge>
						{/if}
					</div>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="max-h-[80dvh] w-80 overflow-scroll p-1 pt-0">
				{#if notifications.length > 0}
					<div class="sticky top-0 z-10 bg-popover pt-1">
						<div class="sticky flex items-baseline justify-between gap-4 px-3 py-2">
							<button
								class="flex cursor-pointer items-center text-sm font-semibold hover:underline"
							>
								Notifications
								<VShapedArrowRight />
							</button>

							{#if unreadCount > 0}
								<button
									class="cursor-pointer text-xs font-medium hover:underline"
									onclick={handleMarkAllAsRead}
								>
									Mark all as read
								</button>
							{/if}
						</div>

						<div
							role="separator"
							aria-orientation="horizontal"
							class="-mx-1 my-1 h-px bg-border"
						></div>
					</div>

					{#each notifications as notification (notification.id)}
						{#if notification.notification}
							<div class="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent">
								<div class="relative flex items-start pe-3">
									<div class="flex-1 space-y-1">
										<button
											class="flex flex-col text-left text-foreground/80 after:absolute after:inset-0"
											onclick={() => handleNotificationClick(notification)}
										>
											<span class="font-medium text-foreground hover:underline">
												{notification.notification.title}:
											</span>

											{notification.notification.message}
										</button>
										<div class="text-xs text-muted-foreground">
											{notification.createdAt.toDateString()}
										</div>
									</div>
									{#if !notification.isRead}
										<div class="absolute end-0 self-center">
											<span class="sr-only">Unread</span>
											{@render Dot()}
										</div>
									{/if}
								</div>
							</div>
						{/if}
					{/each}
				{:else}
					<Empty.Root>
						<Empty.Header>
							<Empty.Media variant="icon">
								<BellOn />
							</Empty.Media>
							<Empty.Title>No Notifications</Empty.Title>
							<Empty.Description>
								Nothing to see here... except your impressive focus.
							</Empty.Description>
						</Empty.Header>
						<!-- <Empty.Content> -->
						<!-- 	<Button variant="outline" size="sm">View History</Button> -->
						<!-- </Empty.Content> -->
					</Empty.Root>
				{/if}
			</Popover.Content>
		</Popover.Root>
	</div>
</header>
