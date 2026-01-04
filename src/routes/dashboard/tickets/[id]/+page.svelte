<script lang="ts">
	import { invalidate } from '$app/navigation';
	import TicketInput from '$lib/components/tickets/detail/ticket-input.svelte';
	import TicketMessage from '$lib/components/tickets/detail/ticket-message.svelte';
	import TicketProperties from '$lib/components/tickets/detail/ticket-properties.svelte';
	import TicketRequester from '$lib/components/tickets/detail/ticket-requester.svelte';
	import TicketTask from '$lib/components/tickets/detail/ticket-tasks.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Rename from '$lib/components/ui/rename';
	import TicketIcon from '$lib/icons/ticket.svelte';
	import type { TicketDetail } from '$lib/types';
	import api from '$lib/utils/axios';
	import { toast } from 'svelte-sonner';

	const {
		data
	}: {
		data: TicketDetail;
	} = $props();

	// svelte-ignore state_referenced_locally
	let ticket = $state(data.ticket);
	let newTicketMessage = $state('');
	let isPrivate = $state(false);
	let selectedFiles = $state<File[]>([]);
	$effect(() => {
		ticket = data.ticket;
	});

	async function handleNewMessage(): Promise<void> {
		try {
			if (!newTicketMessage || newTicketMessage.trim() === '') {
				toast.error('Message cannot be empty.');
				return;
			}

			if (newTicketMessage.length < 11) {
				toast.error('Message too short');
				return;
			}

			const formData = new FormData();
			formData.append('message', newTicketMessage);
			formData.append('ticketId', ticket.id.toString());
			formData.append('isPrivate', isPrivate.toString());

			selectedFiles.forEach((file) => {
				formData.append('files', file);
			});

			const response = await api.post(`/api/tickets/${ticket.id}/messages`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});

			newTicketMessage = '';
			toast.success(response.data.message);
			invalidate('app:ticket');
		} finally {
			selectedFiles = [];
		}
	}

	async function handleSave() {
		if (selectedFiles.length > 0 || newTicketMessage.length > 0) {
			toast.info("You haven't sent your message yet.");
		}
		const ticketUpdate = {
			requesterId: ticket.requesterId,
			assigneeId: ticket.assigneeId || null,
			subject: ticket.subject,
			statusId: ticket.statusId,
			priorityId: ticket.priorityId,
			categoryId: ticket.categoryId
		};
		await api.patch(`/api/tickets/${data.ticket.id}`, { ...ticketUpdate });
		invalidate('app:ticket');
		toast.success('Ticket updated succesfully');
	}

	async function removeTag(tagId: number) {
		await api.delete(`/api/tickets/${ticket.id}/tags/${tagId}`);
	}
	async function addTag(tag: string) {
		await api.post(`/api/tickets/${ticket.id}/tags`, { tag });
	}
</script>

<div class="grid min-w-0 gap-4">
	<div class="flex items-center gap-2">
		<TicketIcon />
		<Rename.Root
			this="span"
			bind:value={ticket.subject}
			validate={(value) => value.length > 0}
			class="rounded-lg p-1 text-2xl hover:bg-muted"
		/>
		<Button onclick={handleSave}>Save</Button>
	</div>

	<div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,384px)_1fr]">
		<div class="flex w-full flex-col gap-4 lg:max-w-sm">
			<TicketRequester
				bind:id={ticket.requesterId}
				bind:name={ticket.requester.name}
				email={ticket.requester.email}
				phone={ticket.requester.phone}
				requester={ticket.requester}
				{handleSave}
			/>
			<TicketProperties
				bind:priorityId={ticket.priorityId}
				bind:categoryId={ticket.categoryId}
				bind:statusId={ticket.statusId}
				bind:userId={ticket.assigneeId}
				bind:tags={ticket.tags}
				statuses={data.statuses}
				users={data.users}
				categories={data.categories}
				priorities={data.priorities}
				{addTag}
				{removeTag}
			/>
			<TicketTask
				tasks={ticket.tasks}
				statuses={data.statuses}
				priorities={data.priorities}
				users={data.users}
				parentTasks={data.parentTasks}
			/>
		</div>

		<div class="flex min-w-0 flex-1 flex-col gap-4">
			<TicketInput
				bind:selectedFiles
				bind:value={newTicketMessage}
				bind:isPrivate
				{handleNewMessage}
			/>
			<TicketMessage bind:messages={ticket.messages} />
		</div>
	</div>
</div>
