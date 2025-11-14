<script lang="ts">
	import * as Rename from '$lib/components/ui/rename';
	import { Button } from '$lib/components/ui/button';
	import TicketIcon from '$lib/icons/ticket.svelte';
	import type { Category, Priority, Status, TicketDetail, User } from '$lib/types';
	import TicketRequester from '$lib/components/tickets/detail/ticket-requester.svelte';
	import TicketProperties from '$lib/components/tickets/detail/ticket-properties.svelte';
	import TicketInput from '$lib/components/tickets/detail/ticket-input.svelte';
	import TicketMessage from '$lib/components/tickets/detail/ticket-message.svelte';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import { ToastComponent } from '$lib/components/ui/toast';
	import { invalidate } from '$app/navigation';

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

	let ticket = $state(data.ticket);
	let newTicketMessage = $state('');
	let isPrivate = $state(false);
	let selectedFiles = $state<File[]>([]);
	$effect(() => {
		ticket = data.ticket;
	});

	async function handleNewMessage() {
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

			const response = await axios.post('/api/ticket-messages', formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});

			if (response.data.success) {
				selectedFiles = [];

				newTicketMessage = '';
				selectedFiles = [];
				invalidate('app:ticket');
				toast.success(response.data.message);
			} else {
				toast.error(ToastComponent, {
					componentProps: {
						title: response.data.message,
						body: response.data.error
					}
				});
			}
		} catch (err) {
			selectedFiles = [];

			if (axios.isAxiosError(err)) {
				if (err.response) {
					const errorMessage = err.response.data?.message || err.response.data?.error;
					toast.error(errorMessage || `Failed to send message (${err.response.status}).`);
				} else if (err.request) {
					toast.error('Network error. Please check your connection and try again.');
				} else {
					toast.error('Failed to send message. Please try again.');
				}
			} else {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error';
				toast.error(`Failed to send message: ${errorMessage}`);
			}
		}
	}

	async function handleSave() {
		try {
			if (selectedFiles.length > 0 || newTicketMessage.length > 0) {
				toast.info("You haven't sent your message yet.");
			}
			const ticketUpdate = {
				requesterId: ticket.requesterId,
				assignedUserId: ticket.assignedUserId || null,
				subject: ticket.subject,
				channel: ticket.channel,
				statusId: ticket.statusId,
				priorityId: ticket.priorityId,
				categoryId: ticket.categoryId,
				firstResponseAt: ticket.firstResponseAt,
				resolvedAt: ticket.resolvedAt,
				closedAt: ticket.closedAt,
				targetDate: ticket.targetDate,
				lastUserResponseAt: ticket.lastUserResponseAt,
				lastRequesterResponseAt: ticket.lastRequesterResponseAt,
				responseCount: ticket.responseCount
			};
			const response = await axios.patch(`/api/tickets/${data.ticket.id}`, ticketUpdate);
			if (response.data.success) {
				invalidate('app:ticket');
				return toast.success('Ticket updated succesfully');
			}
			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Saving ticket failed',
					body: response.data.error || response.data.message
				}
			});
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return toast.error(ToastComponent, {
					componentProps: {
						title: error.response.data.message || 'Saving ticket failed',
						body: error.response.data.error || 'Unknown error'
					}
				});
			}
			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Request failed',
					body: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}
</script>

<div class="grid min-w-0 gap-4">
	<div class="flex items-center gap-2">
		<TicketIcon size={32} />
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
				bind:userId={ticket.assignedUserId}
				bind:tags={ticket.tags}
				statuses={data.statuses}
				users={data.users}
				categories={data.categories}
				priorities={data.priorities}
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
