<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { NotificationSettings } from '$lib/types';
	import { goto } from '$app/navigation';

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

	function handlePrevious() {
		goto('/setup/categories');
	}

	async function handleNext() {
		const response = await axios.post('/api/admin/notification', { notifications });

		if (response.status < 300) {
			return goto('/setup/business-hours');
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/admin/notification');

		if (data.data) notifications = data.data;
	});
</script>

<div class="flex min-h-[72dvh] flex-col gap-6">
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Notification Settings</h1>
	</div>

	<div class="grid gap-2 md:grid-cols-2">
		<Card.Root class="border-none">
			<Card.Title class="text-center">When Ticket is Created</Card.Title>
			<Card.Content class="grid gap-3 rounded-lg p-2">
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Customer (Email):</Label>
					<Switch bind:checked={notifications.ticketCreated.notifyRequester} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Agents (Dashboard):</Label>
					<Switch bind:checked={notifications.ticketCreated.notifyAllUsers} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Agent (Email):</Label>
					<Switch bind:checked={notifications.ticketCreated.notifyUserEmail} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-none">
			<Card.Title class="text-center">When Ticket is Updated</Card.Title>
			<Card.Content class="grid gap-3 rounded-lg p-2">
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Customer (Email):</Label>
					<Switch bind:checked={notifications.ticketUpdated.notifyRequester} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Agent (Dashboard):</Label>
					<Switch bind:checked={notifications.ticketUpdated.notifyAssignedUser} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Agent (Email):</Label>
					<Switch bind:checked={notifications.ticketUpdated.notifyAssignedUserEmail} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-none">
			<Card.Title class="text-center">When Ticket is Assigned</Card.Title>
			<Card.Content class="grid gap-3 rounded-lg p-2">
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Customer (Email):</Label>
					<Switch bind:checked={notifications.ticketAssigned.notifyRequester} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Assigned Agent (Dashboard):</Label>
					<Switch bind:checked={notifications.ticketAssigned.notifyAssignedUsers} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Agent (Email):</Label>
					<Switch bind:checked={notifications.ticketAssigned.notifyUserEmail} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-none">
			<Card.Title class="text-center">When Ticket is Resolved</Card.Title>
			<Card.Content class="grid gap-3 rounded-lg p-2">
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Customer (Email):</Label>
					<Switch bind:checked={notifications.ticketResolved.notifyRequester} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Assigned Agent (Dashboard):</Label>
					<Switch bind:checked={notifications.ticketResolved.notifyUsers} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Agent (Email):</Label>
					<Switch bind:checked={notifications.ticketResolved.notifyUserEmail} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-none">
			<Card.Title class="text-center">When Ticket is Closed</Card.Title>
			<Card.Content class="grid gap-3 rounded-lg p-2">
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Customer (Email):</Label>
					<Switch bind:checked={notifications.ticketClosed.notifyRequester} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Assigned Agent (Dashboard):</Label>
					<Switch bind:checked={notifications.ticketClosed.notifyUsers} />
				</div>
				<div class="flex items-center justify-between">
					<Label class="font-light">Notify Agent (Email):</Label>
					<Switch bind:checked={notifications.ticketClosed.notifyUserEmail} />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="mt-auto flex justify-between gap-4">
		<Button onclick={handlePrevious} variant="outline">Previous</Button>
		<Progress value={45} class="mt-3" />
		<Button onclick={handleNext}>Next</Button>
	</div>
</div>
