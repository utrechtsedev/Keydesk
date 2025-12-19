<script lang="ts">
	import * as Rename from '$lib/components/ui/rename';
	import { Button } from '$lib/components/ui/button';
	import TicketIcon from '$lib/icons/ticket.svelte';
	import type { TicketDetail } from '$lib/types';
	import TicketRequester from '$lib/components/tickets/detail/ticket-requester.svelte';
	import TicketProperties from '$lib/components/tickets/detail/ticket-properties.svelte';
	import TicketInput from '$lib/components/tickets/detail/ticket-input.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import api from '$lib/utils/axios';

	const {
		data
	}: {
		data: TicketDetail;
	} = $props();

	let ticket = $state({
		subject: '',
		message: '',
		selectedFiles: [],
		isPrivate: false,

		requesterId: -1,
		assignedUserId: -1,
		categoryId: -1,
		priorityId: -1,
		responseCount: -1,
		statusId: -1,
		tags: [],

		requester: {
			id: -1,
			name: '',
			email: '',
			phone: '',
			createdAt: new Date(),
			updatedAt: new Date()
		}
	});
	let highlightRequester = $state(false);
	let highlightPriority = $state(false);
	let highlightStatus = $state(false);
	let highlightCategory = $state(false);
	let highlightMessageInput = $state(false);

	async function handleSave() {
		try {
			if (ticket.requester.id < 0) return (highlightRequester = true);
			if (ticket.priorityId < 0) return (highlightPriority = true);
			if (ticket.statusId < 0) return (highlightStatus = true);
			if (ticket.categoryId < 0) return (highlightCategory = true);
			if (ticket.message.length < 10) return (highlightMessageInput = true);
			if (!ticket.subject) return toast.error('Please add a subject.');

			const formData = new FormData();
			formData.append('subject', ticket.subject);
			formData.append('message', ticket.message);
			formData.append('isPrivate', JSON.stringify(ticket.isPrivate));
			formData.append('requesterId', ticket.requesterId.toString());
			formData.append('categoryId', ticket.categoryId.toString());
			formData.append('priorityId', ticket.priorityId.toString());
			formData.append('statusId', ticket.statusId.toString());
			formData.append('channel', 'portal');

			const targetDate = new Date();
			targetDate.setDate(targetDate.getDate() + 7);
			formData.append('targetDate', targetDate.toISOString());

			if (ticket.assignedUserId) {
				formData.append('assignedUserId', String(ticket.assignedUserId));
			}

			ticket.selectedFiles.forEach((file) => {
				formData.append('files', file);
			});

			const response = await api.post('/api/tickets', formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});

			ticket.subject = '';
			ticket.message = '';
			ticket.isPrivate = false;
			ticket.requesterId = -1;
			ticket.assignedUserId = -1;
			ticket.categoryId = -1;
			ticket.priorityId = -1;
			ticket.statusId = -1;

			toast.success(response.data.message);

			goto(`/dashboard/tickets/${response.data.data.ticketId}`);
		} finally {
			ticket.selectedFiles = [];
		}
	}

	$effect(() => {
		if (ticket.requester.id > 0) highlightRequester = false;
		if (ticket.priorityId > 0) highlightPriority = false;
		if (ticket.statusId > 0) highlightStatus = false;
		if (ticket.categoryId > 0) highlightCategory = false;
		if (ticket.message.length > 10) highlightMessageInput = false;
	});
</script>

<div class="grid min-w-0 gap-4">
	<div class="flex items-center gap-2">
		<TicketIcon />
		<Rename.Root
			this="span"
			bind:value={ticket.subject}
			validate={(value) => value.length > 0}
			class="w-full rounded-lg p-1 text-2xl hover:bg-muted"
		/>
		<Button onclick={handleSave}>Save</Button>
	</div>

	<div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,384px)_1fr]">
		<div class="flex w-full flex-col gap-4 lg:max-w-sm">
			<TicketRequester
				bind:id={ticket.requesterId}
				bind:requesterId={ticket.requester.id}
				bind:name={ticket.requester.name}
				bind:email={ticket.requester.email}
				bind:phone={ticket.requester.phone}
				requester={ticket.requester}
				bind:highlight={highlightRequester}
			/>
			<TicketProperties
				bind:priorityId={ticket.priorityId}
				bind:categoryId={ticket.categoryId}
				bind:statusId={ticket.statusId}
				bind:userId={ticket.assignedUserId}
				bind:tags={ticket.tags}
				statuses={data.statuses}
				users={data.users}
				categories={data.categories}
				priorities={data.priorities}
				bind:highlightCategory
				bind:highlightPriority
				bind:highlightStatus
			/>
		</div>

		<div class="flex min-w-0 flex-1 flex-col gap-4">
			<TicketInput
				bind:selectedFiles={ticket.selectedFiles}
				bind:value={ticket.message}
				bind:isPrivate={ticket.isPrivate}
				bind:highlightMessageInput
			/>
		</div>
	</div>
</div>
