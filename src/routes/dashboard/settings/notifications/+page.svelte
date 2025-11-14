<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { NotificationSettings } from '$lib/types';

	let notifications: NotificationSettings = $state({
		ticketCreated: {
			notifyRequester: true,
			notifyAllUsers: true,
			notifyUserEmail: true
		},
		ticketAssigned: {
			notifyRequester: true,
			notifyAssignedUsers: true,
			notifyUserEmail: true
		},
		ticketUpdated: {
			notifyRequester: true,
			notifyAssignedUser: true,
			notifyAssignedUserEmail: true
		},
		ticketResolved: {
			notifyRequester: true,
			notifyUsers: true,
			notifyUserEmail: true
		},
		ticketClosed: {
			notifyRequester: true,
			notifyUsers: true,
			notifyUserEmail: true
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
		<!-- Ticket Created -->
		<div class="border-y bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Created</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer (Email)</Label>
			<Switch bind:checked={notifications.ticketCreated.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Agents (Dashboard)</Label>
			<Switch bind:checked={notifications.ticketCreated.notifyAllUsers} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Agent (Email)</Label>
			<Switch bind:checked={notifications.ticketCreated.notifyUserEmail} />
		</div>

		<!-- Ticket Assigned -->
		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Assigned</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer (Email)</Label>
			<Switch bind:checked={notifications.ticketAssigned.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent (Dashboard)</Label>
			<Switch bind:checked={notifications.ticketAssigned.notifyAssignedUsers} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Agent (Email)</Label>
			<Switch bind:checked={notifications.ticketAssigned.notifyUserEmail} />
		</div>

		<!-- Ticket Updated -->
		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Updated</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer (Email)</Label>
			<Switch bind:checked={notifications.ticketUpdated.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Agent (Dashboard)</Label>
			<Switch bind:checked={notifications.ticketUpdated.notifyAssignedUser} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Agent (Email)</Label>
			<Switch bind:checked={notifications.ticketUpdated.notifyAssignedUserEmail} />
		</div>

		<!-- Ticket Resolved -->
		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Resolved</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer (Email)</Label>
			<Switch bind:checked={notifications.ticketResolved.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent (Dashboard)</Label>
			<Switch bind:checked={notifications.ticketResolved.notifyUsers} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Agent (Email)</Label>
			<Switch bind:checked={notifications.ticketResolved.notifyUserEmail} />
		</div>

		<!-- Ticket Closed -->
		<div class="border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-semibold">When Ticket is Closed</span>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Customer (Email)</Label>
			<Switch bind:checked={notifications.ticketClosed.notifyRequester} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label class="text-md font-normal">Notify Assigned Agent (Dashboard)</Label>
			<Switch bind:checked={notifications.ticketClosed.notifyUsers} />
		</div>
		<div class="flex justify-between px-4 py-3">
			<Label class="text-md font-normal">Notify Agent (Email)</Label>
			<Switch bind:checked={notifications.ticketClosed.notifyUserEmail} />
		</div>
	</div>
</div>
