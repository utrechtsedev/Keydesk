<script lang="ts">
	import * as Empty from '$lib/components/ui/empty';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { PageData, Ticket, User } from '$lib/types';
	import { ConfirmDialog, confirmDialog } from '$lib/components/ui/confirm-dialog';
	import api from '$lib/utils/axios';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import TicketIcon from '$lib/icons/ticket.svelte';
	import DataBulkActionsDialog from '$lib/components/tickets/table/ticket-bulk-actions-dialog.svelte';

	const { data }: { data: PageData & { tickets: Ticket[]; users: User[] } } = $props();

	let bulkActionsOpen = $state(false);
	let searchTerm = $state('');
	let currentPage = $state(0);
	const pageSize = 10;

	let filteredTickets = $derived(
		data.tickets.filter(
			(ticket) =>
				ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
				ticket.status?.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	let paginatedTickets = $derived(
		filteredTickets.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
	);

	let totalPages = $derived(Math.ceil(filteredTickets.length / pageSize));

	$effect(() => {
		if (searchTerm) {
			currentPage = 0;
		}
	});

	function nextPage() {
		if (currentPage < totalPages - 1) {
			currentPage++;
		}
	}

	function previousPage() {
		if (currentPage > 0) {
			currentPage--;
		}
	}
</script>

{#if data.tickets.length !== 0}
	<div class="flex justify-between gap-4 p-4">
		<Input placeholder="Search by subject or status..." bind:value={searchTerm} class="max-w-sm" />
		<div class="flex items-center gap-3">
			<Button
				variant="outline"
				onclick={() =>
					confirmDialog({
						title: 'Unassign all Tickets',
						description:
							'This will remove this user from all assigned tickets. The tickets will remain unassigned.',
						onConfirm: async () => {
							const ids = data.tickets.map((t) => t.id);
							await api.patch('/api/tickets', {
								ids,
								ticket: {
									assigneeId: null
								}
							});
							toast.success('Successfully unassigned all tickets');
							invalidate('app:tickets');
						}
					})}>Unassign All</Button
			>
			<Button onclick={() => (bulkActionsOpen = true)}>Transfer All</Button>
		</div>
	</div>
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-25">No.</Table.Head>
				<Table.Head>Subject</Table.Head>
				<Table.Head>Status</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each paginatedTickets as ticket, i (i)}
				<Table.Row>
					<Table.Cell>{ticket.ticketNumber}</Table.Cell>
					<Table.Cell>{ticket.subject}</Table.Cell>
					<Table.Cell>{ticket.status?.name}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	<div class="flex items-center justify-between px-4 pt-4">
		<div class="text-sm text-muted-foreground">
			Showing {paginatedTickets.length} of {filteredTickets.length} ticket(s)
		</div>
		<div class="flex items-center gap-2">
			<div class="text-sm text-muted-foreground">
				Page {currentPage + 1} of {totalPages || 1}
			</div>
			<div class="space-x-2">
				<Button variant="outline" size="sm" onclick={previousPage} disabled={currentPage === 0}>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={nextPage}
					disabled={currentPage >= totalPages - 1}
				>
					Next
				</Button>
			</div>
		</div>
	</div>
	<DataBulkActionsDialog
		title="Assign Ticket(s)"
		description="Choose a team member to assign to the selected ticket(s)"
		items={data.users}
		bind:open={bulkActionsOpen}
		ids={data.tickets.map((t) => t.id)}
		itemType="user"
	/>
	<ConfirmDialog />
{:else}
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon">
				<TicketIcon />
			</Empty.Media>
			<Empty.Title>No Tickets</Empty.Title>
			<Empty.Description>This user does not have any tickets assigned.</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{/if}
