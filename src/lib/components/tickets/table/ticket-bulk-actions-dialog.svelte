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
		try {
			if (itemType === 'tag' && !selected?.name) {
				return toast.error('Please select a tag');
			}
			const apiConfig = {
				tag: {
					method: 'post' as const,
					endpoint: '/api/tickets/tags',
					payload: { ids, tags: selected?.name ? [selected.name] : [] }
				},
				user: {
					method: 'patch' as const,
					endpoint: '/api/tickets',
					payload: { ids, ticket: { assigneeId: Number(value) } }
				},
				category: {
					method: 'patch' as const,
					endpoint: '/api/tickets',
					payload: { ids, ticket: { categoryId: Number(value) } }
				},
				status: {
					method: 'patch' as const,
					endpoint: '/api/tickets',
					payload: { ids, ticket: { statusId: Number(value) } }
				},
				priority: {
					method: 'patch' as const,
					endpoint: '/api/tickets',
					payload: { ids, ticket: { priorityId: Number(value) } }
				}
			}[itemType];

			await api[apiConfig.method](apiConfig.endpoint, apiConfig.payload);

			invalidate('app:tickets');
			open = false;
			toast.success('Successfully updated ticket(s)');
		} catch (error) {
			toast.error('Failed to update ticket(s)');
			console.error('Update error:', error);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-106.25">
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
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" onclick={handleSave}>
				{itemType === 'tag' ? 'Add tag' : 'Save changes'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
