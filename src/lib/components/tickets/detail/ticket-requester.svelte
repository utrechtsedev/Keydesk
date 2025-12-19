<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import UserUpdate from '$lib/icons/user-update.svelte';
	import Envelope from '$lib/icons/envelope.svelte';
	import Phone from '$lib/icons/phone.svelte';
	import TicketRequesterDialog from '$lib/components/tickets/detail/ticket-requester-dialog.svelte';
	import type { Requester } from '$lib/types';

	let {
		id = $bindable(),
		requesterId = $bindable(),
		name = $bindable(),
		email = $bindable(),
		phone = $bindable(),
		requester,
		handleSave,
		highlight = $bindable(false)
	}: {
		id: number;
		requesterId?: number;
		name: string | null | undefined;
		email: string;
		phone: string | null | undefined;
		requester: Requester;
		handleSave?: () => Promise<void>;
		highlight?: boolean;
	} = $props();

	let requesterDialogOpen = $state(false);
</script>

<Card.Root class={highlight ? 'border-red-600' : ''}>
	<Card.Content class="flex flex-col">
		<div class="mb-2 flex justify-between">
			<h3 class="text-lg">Requester</h3>
			<Button
				variant="secondary"
				class="cursor-pointer"
				onclick={() => (requesterDialogOpen = true)}>Edit</Button
			>
		</div>
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<UserUpdate />
				<span>{name}</span>
			</div>
			<div class="flex items-center gap-2">
				<Envelope />
				<span>{email}</span>
			</div>
			<div class="flex items-center gap-2">
				<Phone />
				<a href="tel:{phone}" target="_blank">{phone}</a>
			</div>
		</div>
	</Card.Content>
</Card.Root>

<TicketRequesterDialog
	bind:requesterId
	bind:id
	bind:phone
	bind:email
	bind:name
	bind:open={requesterDialogOpen}
	{requester}
	{handleSave}
/>
