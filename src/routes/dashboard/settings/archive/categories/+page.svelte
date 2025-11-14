<script lang="ts">
	import * as Item from '$lib/components/ui/item';
	import { Plus, Save, SquarePen, Trash } from '@lucide/svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Category } from '$lib/types';
	import { goto } from '$app/navigation';

	let categories: Category[] = $state([
		{
			id: 1,
			name: 'Technical Issue',
			description: 'Technical problems or bugs',
			prefix: ''
		},
		{
			id: 2,
			name: 'Modification Request',
			description: 'Requests for modification',
			prefix: 'CH'
		},
		{
			id: 3,
			name: 'Question',
			description: 'General questions or how-to',
			prefix: 'Q'
		},
		{
			id: 4,
			name: 'Incident',
			description: 'Service disruption or outage',
			prefix: 'I'
		},
		{
			id: 5,
			name: 'Other',
			description: 'Miscellaneous requests',
			prefix: 'O'
		}
	]);

	let editing = $state();
	function startEdit(category: Category) {
		editing = category;
	}

	function saveEdit() {
		let currentCategory = categories.find((p) => p === editing);
		if (!currentCategory || currentCategory.name.length < 1)
			return toast.error('Category name must be at least 1 character');
		editing = 0;
	}

	function addCategory(array: Category[]) {
		const newItem: Category = {
			name: 'Sample Category',
			description: 'Sample Description',
			prefix: ''
		};
		array.push(newItem);

		return newItem;
	}
	function deleteCategory() {
		if (categories.length === 1)
			return toast.error('Cannot delete last category. At least 1 default category is required.');

		categories = categories.filter((p) => p !== editing);

		editing = {};
	}

	function handlePrevious() {
		goto('/setup/priorities');
	}
	async function handleNext() {
		const response = await axios.post('/api/admin/category', { categories });
		if (response.status < 300) {
			return goto('/setup/notifications');
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/admin/category');
		if (data.data.length > 0) categories = data.data;
	});
</script>

<div class="flex min-h-[72dvh] flex-col gap-6">
	<div class="relative flex items-center justify-center">
		<h1 class="text-2xl font-bold">Category Settings</h1>
		<Button class="absolute right-0" onclick={() => addCategory(categories)}>
			<Plus />Add
		</Button>
	</div>

	<div class="grid gap-6">
		<div class="grid gap-3">
			{#each categories as category (category.id)}
				<Item.Root variant="outline">
					{#if editing === category}
						<Item.Content class="space-y-4">
							<div class="grid gap-3">
								<Label for="category-name">Category Name:</Label>
								<Input name="category-name" type="text" bind:value={category.name} class=" w-52" />
							</div>

							<div class="grid gap-3">
								<Label for="ticket-prefix">Ticket Prefix:</Label>
								<Input name="ticket-prefix" type="text" bind:value={category.prefix} class="w-32" />
							</div>

							<div class="grid gap-3">
								<Label for="description">Description:</Label>
								<Textarea name="description" bind:value={category.description} />
							</div>
						</Item.Content>
						<Item.Actions>
							<Button onclick={deleteCategory}><Trash /></Button>
							<Button onclick={saveEdit}><Save />Save</Button>
						</Item.Actions>
					{:else}
						<Item.Content>
							<div class="space-y-4">
								<Item.Title class="text-xl">{category.name}</Item.Title>
								<div class="flex gap-1">
									<Label>Ticket Prefix:</Label>
									{#if category.prefix}
										<span>{category.prefix}</span>
									{:else}
										<span>(empty)</span>
									{/if}
								</div>

								<div class="grid gap-1">
									<Label>Description:</Label>
									<span class="italic">{category.description}</span>
								</div>
							</div>
						</Item.Content>
						<Item.Actions>
							<Button onclick={() => startEdit(category)}><SquarePen />Edit</Button>
						</Item.Actions>
					{/if}
				</Item.Root>
			{/each}
		</div>
	</div>

	<div class="mt-auto flex justify-between gap-4">
		<Button variant="outline" onclick={handlePrevious}>Previous</Button>
		<Progress value={37.5} class="mt-3" />
		<Button onclick={handleNext}>Next</Button>
	</div>
</div>
