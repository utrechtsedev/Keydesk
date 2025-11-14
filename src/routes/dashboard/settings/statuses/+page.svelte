<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Check, Plus, Save, SquarePen, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Status } from '$lib/types';

	type StatusType = Omit<Status, 'id' | 'createdAt' | 'updatedAt'>;
	let statuses = $state<StatusType[]>([]);
	let editing = $state<StatusType>();

	function startEdit(status: StatusType) {
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
		const newItem: StatusType = {
			name: 'New Status',
			color: '#3B82F6',
			isClosed: false,
			isDefault: false
		};

		statuses.push(newItem);
		editing = newItem;
	}

	function deleteStatus() {
		statuses = statuses.filter((s) => s !== editing);
		editing = undefined;
	}

	async function handleSave() {
		const defaultStatuses = statuses.filter((s) => s.isDefault);
		if (defaultStatuses.length !== 1) return toast.error('You must have exactly 1 default status.');

		const openStatuses = statuses.filter((s) => !s.isClosed);
		if (openStatuses.length < 1) return toast.error('You must have at least 1 open status.');

		const closedStatuses = statuses.filter((s) => s.isClosed);
		if (closedStatuses.length < 1) return toast.error('You must have at least 1 closed status.');

		const response = await axios.post('/api/settings/statuses', { statuses });

		if (response.status < 300) {
			toast.success('Successfully saved status settings.');
			return;
		}

		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/statuses');
		if (data.data && data.data.length > 0) statuses = data.data;
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Status Settings</h1>
			<p class="text-sm text-muted-foreground">Configure ticket statuses</p>
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
		{#each statuses as status, index}
			{@const isFirst = index === 0}
			{@const isEditing = editing === status}

			{#if isEditing}
				<!-- Editing mode - 4 rows for name, color, default, closed -->
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
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="status-default-{index}" class="text-md">Set as Default</Label>
					<Switch id="status-default-{index}" bind:checked={status.isDefault} />
				</div>
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="status-closed-{index}" class="text-md">Mark as Closed</Label>
					<Switch id="status-closed-{index}" bind:checked={status.isClosed} />
				</div>
				<div class="flex justify-end border-b bg-muted/30 px-4 py-3">
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
							style="background-color: {status.color};"
							class="h-6 w-6 rounded border border-border"
						></div>
						<div class="flex flex-col gap-1">
							<span class="text-md font-semibold">{status.name}</span>
							<span class="text-sm text-muted-foreground">
								{#if status.isDefault}
									<Check class="inline h-4 w-4" /> Default
								{/if}
								{#if status.isDefault && status.isClosed}
									•
								{/if}
								{#if status.isClosed}
									<Check class="inline h-4 w-4" /> Closed
								{/if}
								{#if !status.isDefault && !status.isClosed}
									{status.color}
								{/if}
							</span>
						</div>
					</div>
					<div class="flex items-center gap-2">
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
