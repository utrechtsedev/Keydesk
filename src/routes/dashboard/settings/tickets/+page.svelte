<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { TicketConfig } from '$lib/types';
	import { Switch } from '$lib/components/ui/switch';

	let tickets: TicketConfig = $state({
		nextTicketNumber: 1,
		autoCreateRequesters: true,
		ticketPrefix: 'T'
	});

	async function handleNext() {
		if (!tickets.nextTicketNumber || !tickets.ticketPrefix)
			return toast.error('Fill in all required fields.');
		const response = await axios.post('/api/settings/tickets', { tickets });

		if (response.status < 300) {
			toast.success('Succesfully saved ticketing settings.');
			return;
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		let { data } = await axios.get('/api/settings/tickets');
		if (data.data) tickets = data.data;
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Ticket Settings</h1>
			<p class="text-sm text-muted-foreground">Set your ticketing configuration</p>
		</div>
		<Button onclick={handleNext}>Save</Button>
	</div>
	<div class="grid">
		<div class="flex justify-between border-y px-4 py-3">
			<Label for="next-ticket-number" class="text-md">Next Ticket Number</Label>
			<Input
				id="next-ticket-number"
				type="number"
				placeholder="1"
				required
				bind:value={tickets.nextTicketNumber}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="auto-create-requesters" class="text-md">Auto Create Requesters</Label>
			<Switch id="auto-create-requesters" bind:checked={tickets.autoCreateRequesters} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="language" class="text-md">Language</Label>
			<Input
				id="next-ticket-number"
				type="text"
				placeholder="T-"
				required
				bind:value={tickets.ticketPrefix}
				class="w-[40%]"
			/>
		</div>
	</div>
</div>
