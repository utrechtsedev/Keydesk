<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { TicketConfig } from '$lib/types';

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
		return toast.error('Error saving configuration.');
	}

	onMount(async () => {
		let { data } = await axios.get('/api/settings/tickets');
		if (data.data) tickets = data.data;
	});
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Ticket Numbering</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure how tickets are numbered and identified in your system.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Next Ticket Number</Field.Label>
							<Input
								id="next-ticket-number"
								type="number"
								placeholder="1"
								required
								bind:value={tickets.nextTicketNumber}
							/>
							<Field.Description>
								The next ticket number to be assigned. This increments automatically.
							</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Ticket Prefix</Field.Label>
							<Input
								id="ticket-prefix"
								type="text"
								placeholder="T-"
								required
								bind:value={tickets.ticketPrefix}
							/>
							<Field.Description>
								Prefix added to all ticket numbers (e.g., "T-" results in T-0001)
							</Field.Description>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Requester Settings</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure how requesters are handled when new tickets are created.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Auto Create Requesters</Field.Label>
									<Field.Description class="pr-4">
										Automatically create requester accounts when new tickets arrive from unknown
										email addresses
									</Field.Description>
								</div>
								<Switch id="auto-create-requesters" bind:checked={tickets.autoCreateRequesters} />
							</div>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex items-center justify-end space-x-4">
			<Button type="button" variant="outline" class="whitespace-nowrap">Cancel</Button>
			<Button type="button" class="whitespace-nowrap" onclick={handleNext}>Save settings</Button>
		</div>
	</form>
</div>
