<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import type { NotificationSettings, PageData } from '$lib/types';

	const { data }: { data: PageData & { notificationConfig: NotificationSettings } } = $props();

	let notifications = $state(data.notificationConfig);

	type DashboardEventKey = 'created' | 'assigned' | 'updated' | 'resolved' | 'closed';
	type DashboardOptionKey = 'notifyAllUsers' | 'notifyUser';
	type EmailEventKey = 'created' | 'assigned' | 'updated' | 'resolved' | 'closed';
	type EmailOptionKey = 'notifyRequester' | 'notifyAllUsers' | 'notifyUser';

	const dashboardEvents: {
		key: DashboardEventKey;
		title: string;
		options: { key: DashboardOptionKey; label: string }[];
	}[] = [
		{
			key: 'created',
			title: 'Ticket Created',
			options: [{ key: 'notifyAllUsers', label: 'Notify all agents' }]
		},
		{
			key: 'assigned',
			title: 'Ticket Assigned',
			options: [{ key: 'notifyUser', label: 'Notify assigned agent' }]
		},
		{
			key: 'updated',
			title: 'Ticket Updated',
			options: [{ key: 'notifyUser', label: 'Notify assigned agent' }]
		},
		{
			key: 'resolved',
			title: 'Ticket Resolved',
			options: [{ key: 'notifyUser', label: 'Notify assigned agent' }]
		},
		{
			key: 'closed',
			title: 'Ticket Closed',
			options: [{ key: 'notifyUser', label: 'Notify assigned agent' }]
		}
	];

	const emailEvents: {
		key: EmailEventKey;
		title: string;
		options: { key: EmailOptionKey; label: string }[];
	}[] = [
		{
			key: 'created',
			title: 'Ticket Created',
			options: [
				{ key: 'notifyRequester', label: 'Notify customer' },
				{ key: 'notifyAllUsers', label: 'Notify all agents' }
			]
		},
		{
			key: 'assigned',
			title: 'Ticket Assigned',
			options: [
				{ key: 'notifyRequester', label: 'Notify customer' },
				{ key: 'notifyUser', label: 'Notify assigned agent' }
			]
		},
		{
			key: 'updated',
			title: 'Ticket Updated',
			options: [
				{ key: 'notifyRequester', label: 'Notify customer' },
				{ key: 'notifyUser', label: 'Notify assigned agent' }
			]
		},
		{
			key: 'resolved',
			title: 'Ticket Resolved',
			options: [
				{ key: 'notifyRequester', label: 'Notify customer' },
				{ key: 'notifyUser', label: 'Notify assigned agent' }
			]
		},
		{
			key: 'closed',
			title: 'Ticket Closed',
			options: [
				{ key: 'notifyRequester', label: 'Notify customer' },
				{ key: 'notifyUser', label: 'Notify assigned agent' }
			]
		}
	];

	async function handleSave() {
		const response = await axios.post('/api/settings/notifications', { notifications });
		if (response.status < 300) {
			toast.success('Successfully saved notification settings.');
			return;
		}
		return toast.error('Error saving configuration.');
	}
</script>

<div class="flex items-center justify-center p-4 sm:p-10">
	<form class="w-full">
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-10">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Dashboard Notifications</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					In-app notifications for agents
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="space-y-3">
					{#each dashboardEvents as event}
						<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<span class="text-sm font-medium">{event.title}</span>
							<div class="flex w-full items-center gap-4 sm:w-[190px] sm:gap-6">
								{#each event.options as option}
									<div class="flex shrink-0 items-center gap-2">
										<Checkbox
											id="dashboard-{event.key}-{option.key}"
											bind:checked={
												notifications.dashboard.ticket[event.key][
													option.key as keyof (typeof notifications.dashboard.ticket)[typeof event.key]
												]
											}
										/>
										<Field.Label
											for="dashboard-{event.key}-{option.key}"
											class="font-normal whitespace-nowrap"
										>
											{option.label}
										</Field.Label>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<Separator class="my-6 sm:my-8" />

		<div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-10">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Email Notifications</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Email alerts for agents and customers
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="space-y-3">
					{#each emailEvents as event}
						<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<span class="text-sm font-medium">{event.title}</span>
							<div class="flex w-full flex-wrap items-center gap-4 sm:w-[340px] sm:gap-6">
								{#each event.options as option}
									<div class="flex shrink-0 items-center gap-2">
										<Checkbox
											id="email-{event.key}-{option.key}"
											bind:checked={
												notifications.email.ticket[event.key][
													option.key as keyof (typeof notifications.email.ticket)[typeof event.key]
												]
											}
										/>
										<Field.Label
											for="email-{event.key}-{option.key}"
											class="font-normal whitespace-nowrap"
										>
											{option.label}
										</Field.Label>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<Separator class="my-6 sm:my-8" />

		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end sm:space-x-4">
			<Button type="button" variant="outline" class="w-full whitespace-nowrap sm:w-auto">
				Cancel
			</Button>
			<Button type="button" class="w-full whitespace-nowrap sm:w-auto" onclick={handleSave}>
				Save settings
			</Button>
		</div>
	</form>
</div>
