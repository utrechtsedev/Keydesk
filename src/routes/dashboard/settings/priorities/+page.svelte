<script lang="ts">
	import { Check, Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { Switch } from '$lib/components/ui/switch';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Priority } from '$lib/types';

	type PriorityType = Omit<Priority, 'id' | 'createdAt' | 'updatedAt'>;

	let priorities: PriorityType[] = $state([]);
	let editing = $state<PriorityType>();

	function startEdit(priority: PriorityType) {
		editing = priority;
	}

	function cancelEdit() {
		editing = undefined;
	}

	function saveEdit() {
		let currentPriority = priorities.find((p) => p === editing);
		if (!currentPriority || currentPriority.name.length < 1)
			return toast.error('Priority name must be at least 1 character');
		editing = undefined;
	}

	function addPriority() {
		const maxOrder = priorities.length > 0 ? Math.max(...priorities.map((obj) => obj.order)) : 0;
		const newItem: PriorityType = {
			name: 'New Priority',
			color: '#3B82F6',
			order: maxOrder + 1,
			isDefault: false
		};
		priorities.push(newItem);
		editing = newItem;
	}

	function deletePriority() {
		if (priorities.length === 1)
			return toast.error('Cannot delete last priority. At least 1 default priority is required.');

		priorities = priorities.filter((p) => p !== editing);
		editing = undefined;
	}

	async function handleSave() {
		const defaultPriorities = priorities.filter((p) => p.isDefault);
		if (defaultPriorities.length !== 1)
			return toast.error('You must have exactly 1 default priority.');

		const response = await axios.post('/api/settings/priorities', { priorities });

		if (response.status < 300) {
			toast.success('Successfully saved priority settings.');
			return;
		}

		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/priorities');
		if (data.data) priorities = data.data;
	});
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
		{#each priorities as priority, index}
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
						<Button onclick={deletePriority} variant="destructive" size="sm">
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
				<!-- Display mode - single row -->
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
						<Button onclick={deletePriority} variant="destructive" size="sm">
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
