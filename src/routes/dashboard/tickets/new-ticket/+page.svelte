<script lang="ts">
	import * as Rename from '$lib/components/ui/rename';
	import { Button } from '$lib/components/ui/button';
	import TicketIcon from '$lib/icons/ticket.svelte';
	import type { Category, Priority, Status, TicketDetail, User } from '$lib/types';
	import TicketRequester from '$lib/components/tickets/detail/ticket-requester.svelte';
	import TicketProperties from '$lib/components/tickets/detail/ticket-properties.svelte';
	import TicketInput from '$lib/components/tickets/detail/ticket-input.svelte';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import { ToastComponent } from '$lib/components/ui/toast';
	import { goto } from '$app/navigation';

	const {
		data
	}: {
		data: {
			ticket: TicketDetail;
			priorities: Priority[];
			users: User[];
			statuses: Status[];
			categories: Category[];
		};
	} = $props();

	let ticket = $state({
		subject: '',
		message: '',
		selectedFiles: [],
		isPrivate: false,

		requesterId: -1,
		assignedUserId: '',
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
	// color states
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

			// build formdata
			const formData = new FormData();
			formData.append('subject', ticket.subject);
			formData.append('message', ticket.message);
			formData.append('isPrivate', JSON.stringify(ticket.isPrivate));
			formData.append('requesterId', ticket.requesterId.toString());
			formData.append('categoryId', ticket.categoryId.toString());
			formData.append('priorityId', ticket.priorityId.toString());
			formData.append('statusId', ticket.statusId.toString());
			formData.append('channel', 'portal');

			// calculate target date
			const targetDate = new Date();
			targetDate.setDate(targetDate.getDate() + 7); // 7 days from now
			formData.append('targetDate', targetDate.toISOString());

			if (ticket.assignedUserId) {
				formData.append('assignedUserId', ticket.assignedUserId);
			}

			// Append files
			ticket.selectedFiles.forEach((file) => {
				formData.append('files', file);
			});

			const response = await axios.post('/api/tickets', formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});

			if (response.data.success) {
				// Clear form
				ticket.subject = '';
				ticket.message = '';
				ticket.selectedFiles = [];
				ticket.isPrivate = false;
				ticket.requesterId = -1;
				ticket.assignedUserId = '';
				ticket.categoryId = -1;
				ticket.priorityId = -1;
				ticket.statusId = -1;

				toast.success(response.data.message);

				// Navigate to the new ticket
				goto(`/dashboard/tickets/${response.data.data.ticketId}`);
			} else {
				toast.error(ToastComponent, {
					componentProps: {
						title: response.data.message,
						body: response.data.error
					}
				});
			}
		} catch (err) {
			ticket.selectedFiles = [];

			if (axios.isAxiosError(err)) {
				if (err.response) {
					const errorMessage = err.response.data?.message || err.response.data?.error;
					toast.error(errorMessage || `Failed to create ticket (${err.response.status}).`);
				} else if (err.request) {
					toast.error('Network error. Please check your connection and try again.');
				} else {
					toast.error('Failed to create ticket. Please try again.');
				}
			} else {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error';
				toast.error(`Failed to create ticket: ${errorMessage}`);
			}
		}
	}

	$inspect(ticket.requester.id);
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
		<TicketIcon size={32} />
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
