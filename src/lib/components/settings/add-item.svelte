<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as ColorPicker from '$lib/components/ui/color-picker';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import api from '$lib/utils/axios';
	import { toast } from 'svelte-sonner';
	import Badge from '../ui/badge/badge.svelte';
	import { invalidate } from '$app/navigation';

	let { type, open = $bindable() }: { type: 'status' | 'category' | 'priority'; open: boolean } =
		$props();

	let name = $state('');
	let description = $state('');
	let color = $state('#FFFFFF');

	async function handleCreate() {
		let response;
		try {
			if (!name) {
				toast.error(`Please enter a ${type} name.`);
				return;
			}
			switch (type) {
				case 'status':
					response = await api.post('/api/settings/statuses', {
						status: {
							name,
							color
						}
					});
					invalidate('app:statuses');
					break;
				case 'category':
					response = await api.post('/api/settings/categories', {
						category: {
							name,
							description
						}
					});
					invalidate('app:categories');
					break;
				case 'priority':
					response = await api.post('/api/settings/priorities', {
						priority: {
							name,
							color
						}
					});
					invalidate('app:priorities');
					break;
			}
			toast.success(`Successfully created ${type}`);
		} catch {
			toast.error(response?.data.message || `Error creating ${type}.`);
		} finally {
			open = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-106.25">
		<Dialog.Header>
			<Dialog.Title>Create new {type}</Dialog.Title>
			<Dialog.Description>
				Fill in the details below to create a new {type}.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4">
			<div class="grid gap-3">
				<Label for="name">Name</Label>
				<Input id="name" bind:value={name} />
			</div>
			{#if type === 'category'}
				<div class="grid gap-3">
					<Label for="description">Description</Label>
					<Textarea bind:value={description} />
				</div>
			{/if}
			{#if type === 'status' || type === 'priority'}
				<div class="grid gap-3">
					<Label for="description">Color</Label>
					<Popover.Root>
						<Popover.Trigger>
							{#snippet child({ props })}
								<div {...props} class="flex gap-2">
									<Badge class="h-9 w-9 rounded-lg" style="background:{color};" />
									<Button variant="outline" class="flex-1">
										{color}
									</Button>
								</div>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<div class="p-3">
								<ColorPicker.Root bind:value={color} />
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
			<Button type="button" onclick={handleCreate}>Create</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
