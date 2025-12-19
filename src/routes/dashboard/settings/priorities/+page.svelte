<script lang="ts">
	import { Check, Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { Switch } from '$lib/components/ui/switch';
	import type { PageData, Priority } from '$lib/types';
	import api from '$lib/utils/axios';

	const { data }: { data: PageData & { priorities: Priority[] } } = $props();

	let priorities = $state(data.priorities);
	let editing = $state<Priority>();

	function startEdit(priority: Priority) {
		editing = priority;
	}

	function cancelEdit() {
		editing = undefined;
	}

	function saveEdit() {
		let currentPriority = priorities.find((p) => p === editing);
		if (!currentPriority || currentPriority.name.length < 1)
			return toast.error('Priority name must be at least 1 character');

		// If this priority is set to default, unset all others
		if (currentPriority.isDefault) {
			priorities.forEach((p) => {
				if (p !== currentPriority) {
					p.isDefault = false;
				}
			});
		}

		editing = undefined;
	}
	function addPriority() {
		const maxId = priorities.length > 0 ? Math.max(...priorities.map((p) => p.id)) : 0;
		const maxOrder = priorities.length > 0 ? Math.max(...priorities.map((p) => p.order)) : 0;
		const now = new Date();

		const newItem: Priority = {
			id: maxId + 1,
			name: 'New Priority',
			color: '#3B82F6',
			order: maxOrder + 1,
			isDefault: false,
			createdAt: now,
			updatedAt: now
		};
		priorities.push(newItem);
		editing = newItem;
	}

	async function deletePriority(priority: Priority) {
		if (priority.isDefault) {
			return toast.error(
				'Cannot delete the default priority. Set another priority as default first.'
			);
		}

		if (priorities.length <= 1) {
			return toast.error('Cannot delete the last priority. At least 1 priority is required.');
		}

		await api.delete(`/api/settings/priorities/${priority.id}`);

		priorities = priorities.filter((p) => p !== priority);
		if (editing === priority) {
			editing = undefined;
		}
		toast.success('Priority deleted successfully.');
	}

	async function handleSave() {
		const defaultPriorities = priorities.filter((p) => p.isDefault);
		if (defaultPriorities.length !== 1)
			return toast.error('You must have exactly 1 default priority.');

		await api.post('/api/settings/priorities', { priorities });
		toast.success('Successfully saved priority settings.');
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Priority Settings</h1>
			<p class="text-sm text-muted-foreground">Configure ticket priorities</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={addPriority} variant="secondary">
				<Plus />
				Add Priority
			</Button>
			<Button onclick={handleSave}>Save</Button>
		</div>
	</div>

	<div class="grid">
		{#each priorities as priority, index (index)}
			{@const isFirst = index === 0}
			{@const isEditing = editing === priority}

			{#if isEditing}
				<!-- Editing mode - 3 rows for name, color, default -->
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
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="priority-default-{index}" class="text-md">Set as Default</Label>
					<Switch id="priority-default-{index}" bind:checked={priority.isDefault} />
				</div>
				<div class="flex justify-between border-b bg-muted/30 px-4 py-3">
					<div class="flex gap-2">
						<Button onclick={() => deletePriority(priority)} variant="destructive" size="sm">
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
					<div class="flex gap-2">
						<Button onclick={() => deletePriority(priority)} variant="destructive" size="sm">
							<Trash class="h-4 w-4" />
						</Button>
						<Button onclick={() => startEdit(priority)} variant="secondary" size="sm">
							<SquarePen class="h-4 w-4" />
							Edit
						</Button>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
