<script lang="ts">
	import { Plus, Save, SquarePen, Trash, X } from '@lucide/svelte';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Category } from '$lib/types';

	let categories: Category[] = $state([]);
	let editing = $state<Category>();

	function startEdit(category: Category) {
		editing = category;
	}

	function cancelEdit() {
		editing = undefined;
	}

	function saveEdit() {
		let currentCategory = categories.find((p) => p === editing);
		if (!currentCategory || currentCategory.name.length < 1)
			return toast.error('Category name must be at least 1 character');
		editing = undefined;
	}

	function addCategory() {
		const maxId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) : 0;
		const now = new Date();

		const newItem: Category = {
			id: maxId + 1,
			name: 'New Category',
			description: 'Category description',
			prefix: '',
			createdAt: now,
			updatedAt: now
		};
		categories.push(newItem);
		editing = newItem;
	}

	async function deleteCategory(category: Category) {
		if (categories.length === 1)
			return toast.error('Cannot delete last category. At least 1 default category is required.');

		try {
			const response = await axios.delete('/api/settings/categories', {
				data: { id: category.id }
			});

			categories = categories.filter((p) => p !== category);
			if (editing === category) {
				editing = undefined;
			}
			toast.success('Category deleted successfully.');
		} catch (error) {
			if (axios.isAxiosError(error)) {
				toast.error(error.response?.data?.message || 'Error deleting category.');
			} else {
				toast.error('Error deleting category.');
			}
		}
	}

	async function handleSave() {
		const response = await axios.post('/api/settings/categories', { categories });

		if (response.status < 300) {
			toast.success('Successfully saved category settings.');
			return;
		}
		return toast.error('Error saving configuration.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/categories');
		if (data.data && data.data.length > 0) categories = data.data;
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Category Settings</h1>
			<p class="text-sm text-muted-foreground">Configure ticket categories</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={addCategory} variant="secondary">
				<Plus />
				Add Category
			</Button>
			<Button onclick={handleSave}>Save</Button>
		</div>
	</div>

	<div class="grid">
		{#each categories as category, index}
			{@const isFirst = index === 0}
			{@const isEditing = editing === category}

			{#if isEditing}
				<!-- Editing mode - 3 rows for name, prefix, description -->
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
					<Label for="ticket-prefix-{index}" class="text-md">Ticket Prefix</Label>
					<Input
						id="ticket-prefix-{index}"
						type="text"
						bind:value={category.prefix}
						placeholder="Optional"
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
						<Button onclick={saveEdit} size="sm">
							<Save class="h-4 w-4" />
							Save
						</Button>
					</div>
				</div>
			{:else}
				<!-- Display mode - single row -->
				<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
					<div class="flex flex-col gap-1">
						<span class="text-md font-semibold">{category.name}</span>
						<span class="text-sm text-muted-foreground">
							{#if category.prefix}
								Prefix: {category.prefix} •
							{/if}
							{category.description}
						</span>
					</div>
					<div class="flex gap-2">
						<Button onclick={() => deleteCategory(category)} variant="destructive" size="sm">
							<Trash class="h-4 w-4" />
						</Button>
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
