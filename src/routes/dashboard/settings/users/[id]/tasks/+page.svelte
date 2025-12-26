<script lang="ts">
	import * as Empty from '$lib/components/ui/empty';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { PageData, Task, User } from '$lib/types';
	import { ConfirmDialog, confirmDialog } from '$lib/components/ui/confirm-dialog';
	import api from '$lib/utils/axios';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import TaskBulkActionsDialog from '$lib/components/tasks/task-bulk-actions-dialog.svelte';
	import ClipboardContent from '$lib/icons/clipboard-content.svelte';

	const { data }: { data: PageData & { tasks: Task[]; users: User[] } } = $props();

	let bulkActionsOpen = $state(false);
	let searchTerm = $state('');
	let currentPage = $state(0);
	const pageSize = 10;

	let filteredTasks = $derived(
		data.tasks.filter(
			(task) =>
				task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				task.status?.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	let paginatedTasks = $derived(
		filteredTasks.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
	);

	let totalPages = $derived(Math.ceil(filteredTasks.length / pageSize));

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

{#if data.tasks.length !== 0}
	<div class="flex justify-between gap-4 p-4">
		<Input placeholder="Search by title or status..." bind:value={searchTerm} class="max-w-sm" />
		<div class="flex items-center gap-3">
			<Button
				variant="outline"
				onclick={() =>
					confirmDialog({
						title: 'Unassign all Tasks',
						description:
							'This will remove this user from all assigned tickets. The tickets will remain unassigned.',
						onConfirm: async () => {
							const ids = data.tasks.map((t) => t.id);
							await api.patch('/api/tasks', {
								ids,
								task: {
									assigneeId: null
								}
							});
							toast.success('Successfully unassigned all tickets');
							invalidate('app:tasks');
						}
					})}>Unassign All</Button
			>
			<Button onclick={() => (bulkActionsOpen = true)}>Transfer All</Button>
		</div>
	</div>
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Title</Table.Head>
				<Table.Head>Status</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each paginatedTasks as task, i (i)}
				<Table.Row>
					<Table.Cell>{task.title}</Table.Cell>
					<Table.Cell>{task.status?.name}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	<div class="flex items-center justify-between px-4 pt-4">
		<div class="text-sm text-muted-foreground">
			Showing {paginatedTasks.length} of {filteredTasks.length} task(s)
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
	<ConfirmDialog />
	<TaskBulkActionsDialog
		title="Assign Task(s)"
		description="Choose a team member to assign to the selected task(s)"
		items={data.users}
		bind:open={bulkActionsOpen}
		ids={data.tasks.map((t) => t.id)}
		itemType="user"
	/>
{:else}
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon">
				<ClipboardContent />
			</Empty.Media>
			<Empty.Title>No Tasks</Empty.Title>
			<Empty.Description>This user does not have any tasks assigned.</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{/if}
