<script lang="ts">
	import { Check, Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { Switch } from '$lib/components/ui/switch';
	import type { PageData, Status } from '$lib/types';
	import api from '$lib/utils/axios';

	const { data }: { data: PageData & { statuses: Status[] } } = $props();

	let statuses = $state(data.statuses);
	let editing = $state<Status>();

	function startEdit(status: Status) {
		editing = status;
	}

	function cancelEdit() {
		editing = undefined;
	}

	function saveEdit() {
		let currentStatus = statuses.find((s) => s === editing);
		if (!currentStatus || currentStatus.name.length < 1)
			return toast.error('Status name must be at least 1 character');

		if (currentStatus.isDefault && currentStatus.isClosed) {
			return toast.error(
				'A status cannot be both default and closed. New tickets must start as open.'
			);
		}

		if (currentStatus.isDefault) {
			statuses.forEach((s) => {
				if (s !== currentStatus) {
					s.isDefault = false;
				}
			});
		}

		editing = undefined;
	}
	function addStatus() {
		const maxId = statuses.length > 0 ? Math.max(...statuses.map((s) => s.id)) : 0;
		const now = new Date();

		const newItem: Status = {
			id: maxId + 1,
			name: 'New Status',
			color: '#3B82F6',
			isDefault: false,
			isClosed: false,
			createdAt: now,
			updatedAt: now
		};
		statuses.push(newItem);
		editing = newItem;
	}

	async function deleteStatus(status: Status) {
		if (status.isDefault) {
			return toast.error('Cannot delete the default status. Set another status as default first.');
		}

		const openStatuses = statuses.filter((s) => !s.isClosed);
		const closedStatuses = statuses.filter((s) => s.isClosed);

		if (!status.isClosed && openStatuses.length <= 1) {
			return toast.error('Cannot delete the last open status. At least 1 open status is required.');
		}

		if (status.isClosed && closedStatuses.length <= 1) {
			return toast.error(
				'Cannot delete the last closed status. At least 1 closed status is required.'
			);
		}

		await api.delete(`/api/settings/statuses/${status.id}`);

		statuses = statuses.filter((s) => s !== status);
		if (editing === status) {
			editing = undefined;
		}
		toast.success('Status deleted successfully.');
	}

	async function handleSave() {
		const defaultStatuses = statuses.filter((s) => s.isDefault);
		if (defaultStatuses.length !== 1) return toast.error('You must have exactly 1 default status.');

		const openStatuses = statuses.filter((s) => !s.isClosed);
		if (openStatuses.length < 1) return toast.error('You must have at least 1 open status.');

		const closedStatuses = statuses.filter((s) => s.isClosed);
		if (closedStatuses.length < 1) return toast.error('You must have at least 1 closed status.');

		await api.post('/api/settings/statuses', { statuses });
		toast.success('Successfully saved status settings.');
	}
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
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="status-default-{index}" class="text-md">Set as Default</Label>
					<Switch id="status-default-{index}" bind:checked={status.isDefault} />
				</div>
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="status-closed-{index}" class="text-md">Closed Status</Label>
					<Switch id="status-closed-{index}" bind:checked={status.isClosed} />
				</div>
				<div class="flex justify-between border-b bg-muted/30 px-4 py-3">
					<div class="flex gap-2">
						<Button onclick={() => deleteStatus(status)} variant="destructive" size="sm">
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
									<Check class="inline h-4 w-4" /> Default status
								{/if}
								{#if status.isClosed}
									• Closed status
								{/if}
								{#if !status.isDefault && !status.isClosed}
									{status.color}
								{/if}
							</span>
						</div>
					</div>
					<div class="flex gap-2">
						<Button onclick={() => deleteStatus(status)} variant="destructive" size="sm">
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
