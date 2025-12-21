<script lang="ts">
	import { Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import type { Category, PageData } from '$lib/types';
	import api from '$lib/utils/axios';
	import { invalidate } from '$app/navigation';
	import AddItem from '$lib/components/settings/add-item.svelte';

	let { data }: { data: PageData & { categories: Category[] } } = $props();

	let editingId = $state<number | undefined>();
	let openCreateDialog = $state(false);

	function startEdit(category: Category) {
		editingId = category.id;
	}

	function cancelEdit() {
		editingId = undefined;
	}

	async function deleteCategory(category: Category) {
		if (data.categories.length === 1)
			return toast.error('Cannot delete last category. At least 1 default category is required.');

		await api.delete(`/api/settings/categories/${category.id}`);

		if (editingId === category.id) {
			editingId = undefined;
		}

		await invalidate('app:categories');
		toast.success('Category deleted successfully.');
	}

	async function handleSave(category: Category) {
		let currentCategory = data.categories.find((p) => p.id === editingId);
		if (!currentCategory || currentCategory.name.length === 0)
			return toast.error('Category name must be at least 1 character');

		await api.patch(`/api/settings/categories/${category.id}`, { category: currentCategory });
		await invalidate('app:categories');
		toast.success('Successfully saved category.');

		editingId = undefined;
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Category Settings</h1>
			<p class="text-sm text-muted-foreground">Configure ticket categories</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={() => (openCreateDialog = true)} variant="secondary">
				<Plus />
				Add Category
			</Button>
		</div>
	</div>

	<div class="grid">
		{#each data.categories as category, index (category.id)}
			{@const isFirst = index === 0}
			{@const isEditing = editingId === category.id}
			{#if isEditing}
				<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
					<Label for="category-name-{index}" class="text-md">Category Name</Label>
					<Input
						id="category-name-{index}"
						type="text"
						bind:value={category.name}
						class="w-[40%]"
					/>
				</div>
				<div class="flex justify-between border-b px-4 py-3">
					<Label for="description-{index}" class="text-md">Description</Label>
					<Textarea
						id="description-{index}"
						bind:value={category.description}
						class="w-[40%]"
						rows={3}
					/>
				</div>
				<div class="flex justify-between border-b bg-muted/30 px-4 py-3">
					<div class="flex gap-2">
						<Button onclick={() => deleteCategory(category)} variant="destructive" size="sm">
							<Trash class="h-4 w-4" />
							Delete
						</Button>
					</div>
					<div class="flex gap-2">
						<Button onclick={cancelEdit} variant="outline" size="sm">
							<X class="h-4 w-4" />
							Cancel
						</Button>
						<Button onclick={() => handleSave(category)} size="sm">
							<Save class="h-4 w-4" />
							Save
						</Button>
					</div>
				</div>
			{:else}
				<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
					<div class="flex flex-col gap-1">
						<span class="text-md font-semibold">{category.name}</span>
						<span class="text-sm text-muted-foreground">
							{category.description}
						</span>
					</div>
					<div class="flex items-center">
						<Button onclick={() => startEdit(category)} variant="secondary" size="sm">
							<SquarePen class="h-4 w-4" />
							Edit
						</Button>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
<AddItem type="category" bind:open={openCreateDialog} />
