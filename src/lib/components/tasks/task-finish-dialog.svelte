<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { Status, Task } from '$lib/types';
	import api from '$lib/utils/axios';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	const uid = $props.id();
	let {
		open = $bindable(false),
		task,
		statuses
	}: {
		open: boolean;
		task?: Task;
		statuses: Status[];
	} = $props();

	onMount(() => {
		if (!task) return (open = false);
	});

	let value = $state('-1');

	const selectedStatus = $derived(statuses.find((s) => String(s.id) === value));
	async function handleSave() {
		if (!selectedStatus) {
			toast.error('Please select a status first.');
			return;
		}

		await api.patch('/api/tasks', {
			task: { ...task, statusId: selectedStatus.id }
		});

		toast.success(`Succesfully marked task as ${selectedStatus.name}`);
		invalidate('app:tasks');
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Mark Task as Finished</Dialog.Title>
			<Dialog.Description>...</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<Label for={uid}>Select with placeholder</Label>
			<Select.Root type="single" bind:value>
				<Select.Trigger id={uid} class="w-full">
					{selectedStatus?.name ?? 'Select an option'}
				</Select.Trigger>
				<Select.Content>
					{#each statuses as status (status.id)}
						<Select.Item value={String(status.id)}>
							{status.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<Dialog.Footer>
			<Button type="submit" onclick={handleSave}>Save changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
