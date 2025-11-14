<script lang="ts">
	import * as Item from '$lib/components/ui/item';
	import { Switch } from '$lib/components/ui/switch';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Check, Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Status } from '$lib/types';
	import { goto } from '$app/navigation';

	let statuses: Status[] = $state([
		{
			name: 'New',
			color: '#3B82F6',
			isDefault: true,
			isClosed: false
		},
		{
			name: 'Open',
			color: '#10B981',
			isDefault: false,
			isClosed: false
		},
		{
			name: 'Pending',
			color: '#F59E0B',
			isDefault: false,
			isClosed: false
		},
		{
			name: 'On Hold',
			color: '#8B5CF6',
			isDefault: false,
			isClosed: false
		},
		{
			name: 'Resolved',
			color: '#059669',
			isDefault: false,
			isClosed: true
		},
		{
			name: 'Closed',
			color: '#6B7280',
			isDefault: false,
			isClosed: true
		}
	]);

	let editing = $state({});

	function startEdit(status: Status) {
		editing = status;
	}

	function saveEdit() {
		let currentStatus = statuses.find((s) => s === editing);
		if (!currentStatus || currentStatus.name.length < 1)
			return toast.error('Status title must be at least 1 character');
		editing = 0;
	}

	function addStatus(array: Status[]) {
		const newItem: Status = {
			name: 'Sample Status',
			color: '#ffffff',
			isClosed: false,
			isDefault: false
		};

		array.push(newItem);

		return newItem;
	}
	function deleteStatus() {
		statuses = statuses.filter((s) => s !== editing);
		editing = {};
	}
	function handlePrevious() {
		goto('/setup/email');
	}
	async function handleNext() {
		const defaultStatuses = statuses.filter((s) => s.isDefault);
		if (defaultStatuses.length !== 1) return toast.error('You must have 1 default status.');
		const openStatuses = statuses.filter((s) => !s.isClosed);
		if (openStatuses.length < 1) return toast.error('You must have at least 1 open status.');
		const closedStatuses = statuses.filter((s) => s.isClosed);
		if (closedStatuses.length < 1) return toast.error('You must have at least 1 closed status.');

		const response = await axios.post('/api/admin/status', { statuses });
		if (response.status < 300) {
			return goto('/setup/priorities');
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}
	onMount(async () => {
		const { data } = await axios.get('/api/admin/status');
		if (data.data.length > 0) statuses = data.data;
	});
</script>

<div class="flex min-h-[72dvh] flex-col gap-6">
	<div class="relative flex items-center justify-center">
		<h1 class="text-2xl font-bold">Ticket Status Settings</h1>
		<Button class="absolute right-0" onclick={() => addStatus(statuses)}>
			<Plus />Add
		</Button>
	</div>

	<div class="grid gap-6">
		<div class="grid gap-3">
			{#each statuses as status}
				<Item.Root variant="outline">
					{#if editing === status}
						<Item.Content class="space-y-4">
							<Input bind:value={status.name} class=" w-52" />

							<div class="grid gap-4 md:grid-cols-2">
								<div class="flex items-center gap-2">
									<span>Default: </span>
									<Switch bind:checked={status.isDefault} class="p-0" />
								</div>
								<div class="flex items-center gap-2">
									<span>Closed:</span>
									<Switch bind:checked={status.isClosed} class="p-0" />
								</div>
								<div class="flex items-center gap-2">
									Color:
									<Input type="color" bind:value={status.color} class="p-0" />
								</div>
							</div>
						</Item.Content>
						<Item.Actions>
							<Button onclick={deleteStatus}><Trash /></Button>
							<Button onclick={saveEdit}><Save />Save</Button>
						</Item.Actions>
					{:else}
						<Item.Content>
							<Item.Title class="text-xl">{status.name}</Item.Title>
							<div class="grid gap-2 md:grid-cols-2">
								<span
									>Default: {#if status.isDefault}
										<Check class="inline-flex" />
									{:else}
										<X class="inline-flex" />
									{/if}
								</span>
								<span
									>Closed: {#if status.isClosed}
										<Check class="inline-flex" />
									{:else}
										<X class="inline-flex" />
									{/if}
								</span>
								<span>
									Color:
									<span
										style="background-color: {status.color};"
										class="ml-1 rounded-md p-1 text-white"
									>
										{status.color}
									</span>
								</span>
							</div>
						</Item.Content>
						<Item.Actions>
							<Button onclick={() => startEdit(status)}><SquarePen />Edit</Button>
						</Item.Actions>
					{/if}
				</Item.Root>
			{/each}
		</div>
	</div>

	<div class="mt-auto flex justify-between gap-4">
		<Button variant="outline" onclick={handlePrevious}>Previous</Button>
		<Progress value={22.5} class="mt-3" />
		<Button onclick={handleNext}>Next</Button>
	</div>
</div>
