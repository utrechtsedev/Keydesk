<script lang="ts">
	import { Check, Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import type { PageData, Status, NewStatus } from '$lib/types';
	import api from '$lib/utils/axios';

	const { data }: { data: PageData & { statuses: Status[] } } = $props();

	let statuses = $state<(Status | NewStatus)[]>(data.statuses);
	let editing = $state<Status | NewStatus | undefined>();

	function startEdit(status: Status | NewStatus) {
		editing = status;
	}

	function cancelEdit() {
		editing = undefined;
	}

	function saveEdit() {
		let currentStatus = statuses.find((s) => s === editing);
		if (!currentStatus || currentStatus.name.length < 1)
			return toast.error('Status name must be at least 1 character');

		editing = undefined;
	}

	function addStatus() {
		const newItem: NewStatus = {
			name: 'New Status',
			color: '#3B82F6',
			isDefault: false,
			isResolved: false,
			isClosed: false,
		};
		statuses.push(newItem);
		editing = newItem;
	}

	// Type guard to check if status is a Status (has id) or NewStatus
	function isStatus(status: Status | NewStatus): status is Status {
		return 'id' in status;
	}

	async function deleteStatus(status: Status | NewStatus) {
		// Prevent deletion of system statuses
		if (status.isDefault || status.isResolved || status.isClosed) {
			return toast.error('Cannot delete system statuses (Default, Resolved, or Closed).');
		}

		// Only call API if status has an id (exists in database)
		if (isStatus(status)) {
			await api.delete(`/api/settings/statuses/${status.id}`);
		}

		statuses = statuses.filter((s) => s !== status);
		if (editing === status) {
			editing = undefined;
		}
		toast.success('Status deleted successfully.');
	}

	async function handleSave() {
		// Validate required system statuses
		const defaultStatuses = statuses.filter((s) => s.isDefault);
		if (defaultStatuses.length !== 1) 
			return toast.error('You must have exactly 1 default status.');

		const resolvedStatuses = statuses.filter((s) => s.isResolved);
		if (resolvedStatuses.length !== 1) 
			return toast.error('You must have exactly 1 resolved status.');

		const closedStatuses = statuses.filter((s) => s.isClosed);
		if (closedStatuses.length !== 1) 
			return toast.error('You must have exactly 1 closed status.');

		const openStatuses = statuses.filter((s) => !s.isClosed && !s.isResolved);
		if (openStatuses.length < 1) 
			return toast.error('You must have at least 1 open status.');

		await api.post('/api/settings/statuses', { statuses });
		toast.success('Successfully saved status settings.');
	}

	function isSystemStatus(status: Status | NewStatus): boolean {
		return status.isDefault || status.isResolved || status.isClosed;
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Status Settings</h1>
			<p class="text-sm text-muted-foreground">
				Configure ticket statuses. System statuses (Default, Resolved, Closed) can be renamed but not deleted.
			</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={addStatus} variant="secondary">
				<Plus />
				Add Status
			</Button>
			<Button onclick={handleSave}>Save</Button>
		</div>
	</div>

	<div class="grid">
		{#each statuses as status, index (index)}
			{@const isFirst = index === 0}
			{@const isEditing = editing === status}
			{@const isSystem = isSystemStatus(status)}

			{#if isEditing}
				<!-- Editing mode -->
				<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
					<Label for="status-name-{index}" class="text-md">Status Name</Label>
					<Input id="status-name-{index}" type="text" bind:value={status.name} class="w-[40%]" />
				</div>
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="status-color-{index}" class="text-md">Color</Label>
					<Input
						id="status-color-{index}"
						type="color"
						bind:value={status.color}
						class="h-10 w-24 cursor-pointer"
					/>
				</div>
				<div class="flex justify-between border-b bg-muted/30 px-4 py-3">
					<div class="flex gap-2">
						<Button 
							onclick={() => deleteStatus(status)} 
							variant="destructive" 
							size="sm"
							disabled={isSystem}
						>
							<Trash class="h-4 w-4" />
							Delete
						</Button>
					</div>
					<div class="flex gap-2">
						<Button onclick={cancelEdit} variant="outline" size="sm">
							<X class="h-4 w-4" />
							Cancel
						</Button>
						<Button onclick={saveEdit} size="sm">
							<Save class="h-4 w-4" />
							Save
						</Button>
					</div>
				</div>
			{:else}
				<!-- Display mode -->
				<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
					<div class="flex items-center gap-4">
						<div
							style="background-color: {status.color};"
							class="h-6 w-6 rounded border border-border"
						></div>
						<div class="flex flex-col gap-1">
							<span class="text-md font-semibold">{status.name}</span>
							<span class="text-sm text-muted-foreground">
								{#if status.isDefault}
									<Check class="inline h-4 w-4" /> Default
								{/if}
								{#if status.isResolved}
									{#if status.isDefault}•{/if}
									Resolved
								{/if}
								{#if status.isClosed}
									{#if status.isDefault || status.isResolved}•{/if}
									Closed
								{/if}
								{#if !isSystem}
									{status.color}
								{/if}
							</span>
						</div>
					</div>
					<div class="flex gap-2">
						<Button 
							onclick={() => deleteStatus(status)} 
							variant="destructive" 
							size="sm"
							disabled={isSystem}
						>
							<Trash class="h-4 w-4" />
						</Button>
						<Button onclick={() => startEdit(status)} variant="secondary" size="sm">
							<SquarePen class="h-4 w-4" />
							Edit
						</Button>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
