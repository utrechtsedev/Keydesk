<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import type { PageData, Status, NewStatus } from '$lib/types';
	import api from '$lib/utils/axios';
	import AddItem from '$lib/components/settings/add-item.svelte';
	import { invalidate } from '$app/navigation';
	import Plus from '$lib/icons/plus.svelte';
	import Trash2 from '$lib/icons/trash-2.svelte';
	import Xmark from '$lib/icons/xmark.svelte';
	import FloppyDisk from '$lib/icons/floppy-disk.svelte';
	import Check from '$lib/icons/check.svelte';
	import Compose3 from '$lib/icons/compose-3.svelte';

	let { data }: { data: PageData & { statuses: Status[] } } = $props();

	let editingId = $state<number | undefined>();
	let openCreateDialog = $state(false);

	function startEdit(status: Status) {
		editingId = status.id;
	}

	function cancelEdit() {
		editingId = undefined;
	}

	async function handleSave(status: Status) {
		let currentStatus = data.statuses.find((s) => s.id === editingId);
		if (!currentStatus || currentStatus.name.length < 1)
			return toast.error('Status name must be at least 1 character');

		await api.patch(`/api/settings/statuses/${status.id}`, { status: currentStatus });
		await invalidate('app:statuses');
		toast.success('Successfully saved status.');

		editingId = undefined;
	}

	function isStatus(status: Status | NewStatus): status is Status {
		return 'id' in status;
	}

	async function deleteStatus(status: Status | NewStatus) {
		if (status.isDefault || status.isResolved || status.isClosed) {
			return toast.error('Cannot delete system statuses (Default, Resolved, or Closed).');
		}

		if (isStatus(status)) {
			await api.delete(`/api/settings/statuses/${status.id}`);
		}

		if (isStatus(status) && editingId === status.id) {
			editingId = undefined;
		}

		await invalidate('app:statuses');
		toast.success('Status deleted successfully.');
	}

	function isSystemStatus(status: Status | NewStatus): boolean {
		return status.isDefault! || status.isResolved! || status.isClosed!;
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Status Settings</h1>
			<p class="text-sm text-muted-foreground">
				Configure ticket statuses. System statuses (Default, Resolved, Closed) can be renamed but
				not deleted.
			</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={() => (openCreateDialog = true)} variant="secondary">
				<Plus />
				Add Status
			</Button>
		</div>
	</div>

	<div class="grid">
		{#each data.statuses as status, index (status.id)}
			{@const isFirst = index === 0}
			{@const isEditing = editingId === status.id}
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
							<Trash2 class="h-4 w-4" />
							Delete
						</Button>
					</div>
					<div class="flex gap-2">
						<Button onclick={cancelEdit} variant="outline" size="sm">
							<Xmark class="h-4 w-4" />
							Cancel
						</Button>
						<Button onclick={() => handleSave(status)} size="sm">
							<FloppyDisk class="h-4 w-4 invert-0!" />
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
					<div class="flex items-center">
						<Button onclick={() => startEdit(status)} variant="secondary" size="sm">
							<Compose3 class="h-4 w-4" />
							Edit
						</Button>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
<AddItem type="status" bind:open={openCreateDialog} />
