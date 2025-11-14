<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ToastComponent } from '$lib/components/ui/toast';
	import type { Category, Priority, Status, Tag, User } from '$lib/types';
	import axios from 'axios';
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
			await axios.patch('/api/tickets/bulk', {
				ids,
				itemId: value,
				itemType
			});
			invalidate('app:tickets');
			open = false;
			return toast.success('Succesfully updated ticket(s).');
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return toast.error(ToastComponent, {
					componentProps: {
						title: error.response.data.message || 'Connection failed',
						body: error.response.data.error || 'Unknown error'
					}
				});
			}

			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Request failed',
					body: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}. Updating {ids.length} ticket(s).</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<Label for={uid}>Select with placeholder</Label>
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
			<Button type="submit" onclick={handleSave}>Save changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
