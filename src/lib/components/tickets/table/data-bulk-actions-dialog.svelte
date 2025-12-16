<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { Category, Priority, Status, Tag, User } from '$lib/types';
	import api from '$lib/utils/axios';
	import { toast } from 'svelte-sonner';

	const uid = $props.id();

	let {
		title,
		description,
		ids = [],
		open = $bindable(false),
		items,
		itemType
	}: {
		title: string;
		description: string;
		ids: number[];
		open: boolean;
		items: User[] | Category[] | Status[] | Priority[] | Tag[];
		itemType: 'user' | 'category' | 'status' | 'priority' | 'tag';
	} = $props();

	let value = $state('-1');
	const selected = $derived(items.find((i) => String(i.id) === value));

	async function handleSave() {
		if (itemType === 'tag') {
			if (!selected?.name) {
				return toast.error('Please select a tag');
			}

			await api.patch('/api/tags/bulk', {
				ids,
				tag: selected.name,
				type: 'ticket'
			});
		} else {
			await api.patch('/api/tickets/bulk', {
				ids,
				itemId: Number(value),
				itemType
			});
		}
		invalidate('app:tickets');
		open = false;
		return toast.success('Successfully updated ticket(s)');
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				{description}. {itemType === 'tag' ? 'Adding tag to' : 'Updating'}
				{ids.length} ticket(s).
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<Label for={uid}>
				{itemType === 'tag' ? 'Select tag to add' : 'Select an option'}
			</Label>
			<Select.Root type="single" bind:value>
				<Select.Trigger id={uid} class="w-full">
					{selected?.name ?? 'Select an option'}
				</Select.Trigger>
				<Select.Content>
					{#each items as item (item.id)}
						<Select.Item value={String(item.id)}>
							{item.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<Dialog.Footer>
			<Button type="submit" onclick={handleSave}>
				{itemType === 'tag' ? 'Add tag' : 'Save changes'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
