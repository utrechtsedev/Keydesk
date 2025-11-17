<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { NotificationSettings } from '$lib/types';

	let notifications: NotificationSettings = $state({
		dashboard: {
			ticket: {
				created: {
					notifyAllUsers: true
				},
				assigned: {
					notifyUser: true
				},
				updated: {
					notifyUser: true
				},
				resolved: {
					notifyUser: true
				},
				closed: {
					notifyUser: true
				}
			}
		},
		email: {
			ticket: {
				created: {
					notifyAllUsers: true,
					notifyRequester: true
				},
				assigned: {
					notifyUser: true,
					notifyRequester: true
				},
				updated: {
					notifyUser: true,
					notifyRequester: true
				},
				resolved: {
					notifyUser: true,
					notifyRequester: true
				},
				closed: {
					notifyUser: true,
					notifyRequester: true
				}
			}
		}
	});

	async function handleSave() {
		const response = await axios.post('/api/settings/notifications', { notifications });

		if (response.status < 300) {
			toast.success('Successfully saved notification settings.');
			return;
		}

		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/notifications');

		if (data.data) notifications = data.data;
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Notification Settings</h1>
			<p class="text-sm text-muted-foreground">Configure notification preferences</p>
		</div>
		<Button onclick={handleSave}>Save</Button>
	</div>

	<div class="grid">
		<div class="border-y bg-primary/10 px-4 py-3">
			<h2 class="text-lg font-bold">Dashboard Notifications</h2>
			<p class="text-xs text-muted-foreground">In-app notifications for agents</p>
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Created</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify All Agents</Label>
			<Switch bind:checked={notifications.dashboard.ticket.created.notifyAllUsers} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Assigned</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.dashboard.ticket.assigned.notifyUser} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Updated</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.dashboard.ticket.updated.notifyUser} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Resolved</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.dashboard.ticket.resolved.notifyUser} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Closed</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.dashboard.ticket.closed.notifyUser} />
		</div>

		<div class="border-y bg-primary/10 px-4 py-3">
			<h2 class="text-lg font-bold">Email Notifications</h2>
			<p class="text-xs text-muted-foreground">Email alerts for agents and customers</p>
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Created</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer</Label>
			<Switch bind:checked={notifications.email.ticket.created.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify All Agents</Label>
			<Switch bind:checked={notifications.email.ticket.created.notifyAllUsers} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Assigned</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer</Label>
			<Switch bind:checked={notifications.email.ticket.assigned.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.email.ticket.assigned.notifyUser} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Updated</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer</Label>
			<Switch bind:checked={notifications.email.ticket.updated.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.email.ticket.updated.notifyUser} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Resolved</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer</Label>
			<Switch bind:checked={notifications.email.ticket.resolved.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.email.ticket.resolved.notifyUser} />
		</div>

		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Closed</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer</Label>
			<Switch bind:checked={notifications.email.ticket.closed.notifyRequester} />
		</div>
		<div class="flex justify-between px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent</Label>
			<Switch bind:checked={notifications.email.ticket.closed.notifyUser} />
		</div>
	</div>
</div>
