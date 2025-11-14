<script lang="ts">
	import * as Item from '$lib/components/ui/item';
	import { Check, Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { Switch } from '$lib/components/ui/switch';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Priority } from '$lib/types';
	import { goto } from '$app/navigation';

	let priorities: Priority[] = $state([
		{
			id: 1,
			name: 'Low',
			color: '#94A3B8',
			order: 1,
			isDefault: false
		},
		{
			id: 2,
			name: 'Medium',
			color: '#3B82F6',
			order: 2,
			isDefault: true
		},
		{
			id: 3,
			name: 'High',
			color: '#F59E0B',
			order: 3,
			isDefault: false
		},
		{
			id: 4,
			name: 'Urgent',
			color: '#EF4444',
			order: 4,
			isDefault: false
		}
	]);

	let editing = $state();
	function startEdit(priority: Priority) {
		editing = priority;
	}

	function saveEdit() {
		let currentPriority = priorities.find((p) => p === editing);
		if (!currentPriority || currentPriority.name.length < 1)
			return toast.error('Priority name must be at least 1 character');
		editing = {};
	}

	function addPriority(array: Priority[]) {
		const maxOrder = array.length > 0 ? Math.max(...array.map((obj) => obj.order)) : 0;
		const newItem: Priority = {
			name: 'Sample Priority',
			color: '#ffffff',
			order: maxOrder + 1,
			isDefault: false
		};
		array.push(newItem);

		return newItem;
	}
	function deletePriority() {
		if (priorities.length === 1)
			return toast.error('Cannot delete last priority. At least 1 default priority is required.');

		priorities = priorities.filter((p) => p !== editing);

		editing = {};
	}

	function handlePrevious() {
		goto('/setup/statuses');
	}
	async function handleNext() {
		const defaultPriorities = priorities.filter((p) => p.isDefault);
		if (defaultPriorities.length !== 1) return toast.error('You must have 1 default priority.');

		const response = await axios.post('/api/admin/priority', { priorities });
		if (response.status < 300) {
			return goto('/setup/categories');
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/admin/priority');
		if (!data.data) return;
		priorities = data.data;
	});
</script>

<div class="flex min-h-[72dvh] flex-col gap-6">
	<div class="relative flex items-center justify-center">
		<h1 class="text-2xl font-bold">Priority Settings</h1>
		<Button class="absolute right-0" onclick={() => addPriority(priorities)}>
			<Plus />Add
		</Button>
	</div>
	<div class="grid gap-6">
		<div class="grid gap-3">
			{#each priorities as priority (priority.id)}
				<Item.Root variant="outline">
					{#if editing === priority}
						<Item.Content class="space-y-4">
							<Input bind:value={priority.name} class=" w-52" />

							<div class="grid gap-4 md:grid-cols-2">
								<div class="flex items-center gap-2">
									<span>Default: </span>
									<Switch bind:checked={priority.isDefault} class="p-0" />
								</div>
								<div class="flex items-center gap-2">
									<span>Color:</span>
									<Input type="color" bind:value={priority.color} class="p-0" />
								</div>
							</div>
						</Item.Content>
						<Item.Actions>
							<Button onclick={deletePriority}><Trash /></Button>
							<Button onclick={saveEdit}><Save />Save</Button>
						</Item.Actions>
					{:else}
						<Item.Content>
							<Item.Title class="text-xl">{priority.name}</Item.Title>
							<div class="grid gap-2 md:grid-cols-2">
								<span
									>Default: {#if priority.isDefault}
										<Check class="inline-flex" />
									{:else}
										<X class="inline-flex" />
									{/if}
								</span>
								<span>
									Color:
									<span
										style="background-color: {priority.color};"
										class="ml-1 rounded-md p-1 text-white"
									>
										{priority.color}
									</span>
								</span>
							</div>
						</Item.Content>
						<Item.Actions>
							<Button onclick={() => startEdit(priority)}><SquarePen />Edit</Button>
						</Item.Actions>
					{/if}
				</Item.Root>
			{/each}
		</div>
	</div>

	<div class="mt-auto flex justify-between gap-4">
		<Button variant="outline" onclick={handlePrevious}>Previous</Button>
		<Progress value={30} class="mt-3" />
		<Button onclick={handleNext}>Next</Button>
	</div>
</div>
