<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import type { PageData, Priority } from '$lib/types';
	import api from '$lib/utils/axios';
	import AddItem from '$lib/components/settings/add-item.svelte';
	import { invalidate } from '$app/navigation';
	import Plus from '$lib/icons/plus.svelte';
	import Check from '$lib/icons/check.svelte';
	import Compose3 from '$lib/icons/compose-3.svelte';
	import FloppyDisk from '$lib/icons/floppy-disk.svelte';
	import Xmark from '$lib/icons/xmark.svelte';
	import Trash2 from '$lib/icons/trash-2.svelte';

	let { data }: { data: PageData & { priorities: Priority[] } } = $props();

	let editingId = $state<number | undefined>();
	let openCreateDialog = $state(false);

	function startEdit(priority: Priority) {
		editingId = priority.id;
	}

	function cancelEdit() {
		editingId = undefined;
	}

	async function deletePriority(priority: Priority) {
		if (priority.isDefault) {
			return toast.error(
				'Cannot delete the default priority. Set another priority as default first.'
			);
		}

		if (data.priorities.length <= 1) {
			return toast.error('Cannot delete the last priority. At least 1 priority is required.');
		}

		await api.delete(`/api/settings/priorities/${priority.id}`);

		if (editingId === priority.id) {
			editingId = undefined;
		}

		await invalidate('app:priorities');
		toast.success('Priority deleted successfully.');
	}

	async function handleSave(priority: Priority) {
		let currentPriority = data.priorities.find((p) => p.id === editingId);
		if (!currentPriority || currentPriority.name.length === 0)
			return toast.error('Priority name must be at least 1 character');

		await api.patch(`/api/settings/priorities/${priority.id}`, { priority: currentPriority });
		await invalidate('app:priorities');
		toast.success('Successfully saved priority.');

		editingId = undefined;
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Priority Settings</h1>
			<p class="text-sm text-muted-foreground">Configure ticket priorities</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={() => (openCreateDialog = true)} variant="secondary">
				<Plus />
				Add Priority
			</Button>
		</div>
	</div>

	<div class="grid">
		{#each data.priorities as priority, index (priority.id)}
			{@const isFirst = index === 0}
			{@const isEditing = editingId === priority.id}

			{#if isEditing}
				<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
					<Label for="priority-name-{index}" class="text-md">Priority Name</Label>
					<Input
						id="priority-name-{index}"
						type="text"
						bind:value={priority.name}
						class="w-[40%]"
					/>
				</div>
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="priority-color-{index}" class="text-md">Color</Label>
					<Input
						id="priority-color-{index}"
						type="color"
						bind:value={priority.color}
						class="h-10 w-24 cursor-pointer"
					/>
				</div>
				<div class="flex justify-between border-b bg-muted/30 px-4 py-3">
					<div class="flex gap-2">
						<Button onclick={() => deletePriority(priority)} variant="destructive" size="sm">
							<Trash2 class="h-4 w-4" />
							Delete
						</Button>
					</div>
					<div class="flex gap-2">
						<Button onclick={cancelEdit} variant="outline" size="sm">
							<Xmark class="h-4 w-4" />
							Cancel
						</Button>
						<Button onclick={() => handleSave(priority)} size="sm">
							<FloppyDisk class="h-4 w-4 invert-0!" />
							Save
						</Button>
					</div>
				</div>
			{:else}
				<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
					<div class="flex items-center gap-4">
						<div
							style="background-color: {priority.color};"
							class="h-6 w-6 rounded border border-border"
						></div>
						<div class="flex flex-col gap-1">
							<span class="text-md font-semibold">{priority.name}</span>
							<span class="text-sm text-muted-foreground">
								{#if priority.isDefault}
									<Check class="inline h-4 w-4" /> Default priority
								{:else}
									{priority.color}
								{/if}
							</span>
						</div>
					</div>
					<div class="flex items-center">
						<Button onclick={() => startEdit(priority)} variant="secondary" size="sm">
							<Compose3 class="h-4 w-4" />
							Edit
						</Button>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
<AddItem type="priority" bind:open={openCreateDialog} />
