<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { Requester } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import api from '$lib/utils/axios';

	const uid = $props.id();

	let {
		open = $bindable(false),
		requester,
		id = $bindable(),
		name = $bindable(),
		phone = $bindable(),
		email = $bindable(),
		requesterId = $bindable(),
		handleSave
	}: {
		open: boolean;
		requester: Requester;
		id: number;
		name: string | null | undefined;
		phone: string | null | undefined;
		email?: string;
		requesterId?: number;
		handleSave?: () => Promise<any>;
	} = $props();

	let searchQuery = $state('');
	let requesters = $state<Requester[]>([]);
	let loading = $state(false);
	let showDropdown = $state(false);
	let selectedRequester = $state<Requester | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let isSelecting = $state(false);

	function handleSearch(query: string) {
		searchQuery = query;

		if (isSelecting) {
			isSelecting = false;
			return;
		}

		clearTimeout(debounceTimer);

		if (!query.trim()) {
			requesters = [];
			showDropdown = false;
			return;
		}

		requesters = [];
		loading = true;
		showDropdown = true;

		debounceTimer = setTimeout(async () => {
			await searchRequesters(query);
		}, 300);
	}

	async function searchRequesters(query: string) {
		try {
			const response = await api.get(`/api/requesters?search=${encodeURIComponent(query)}`);
			requesters = response.data.requesters;
		} catch (error) {
			requesters = [];
		} finally {
			loading = false;
		}
	}

	function selectRequester(req: Requester) {
		id = req.id;
		requesterId = req.id;
		name = req.name || undefined;
		email = req.email;
		phone = req.phone || undefined;

		selectedRequester = req;
		isSelecting = true;
		searchQuery = req.name || req.email;
		showDropdown = false;
		requesters = [];
	}

	$effect(() => {
		if (open) {
			isSelecting = true;
			searchQuery = requester.name || requester.email || '';
			selectedRequester = requester;
			requesters = [];
			showDropdown = false;
			loading = false;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Change Requester</Dialog.Title>
			<Dialog.Description>Search and select a new requester for this ticket</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="requester-search relative">
				<Label for={uid}>Search Requester</Label>
				<Input
					id={uid}
					type="text"
					value={searchQuery}
					oninput={(e) => handleSearch(e.currentTarget.value)}
					onfocus={() => {
						if (requesters.length > 0) showDropdown = true;
					}}
					placeholder="Search by name, email, or phone..."
					class="mt-2"
				/>

				{#if showDropdown && (loading || requesters.length > 0)}
					<div
						transition:slide={{ duration: 200, easing: quintOut }}
						class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
					>
						{#if loading}
							<div class="px-4 py-3 text-sm text-muted-foreground">Searching...</div>
						{:else if requesters.length === 0}
							<div class="px-4 py-3 text-sm text-muted-foreground">No requesters found</div>
						{:else}
							{#each requesters as req}
								<button
									type="button"
									class="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
									onclick={() => selectRequester(req)}
								>
									<div class="font-medium">{req.name || 'No name'}</div>
									<div class="text-xs text-muted-foreground">
										{req.email}
										{#if req.phone}
											• {req.phone}
										{/if}
									</div>
								</button>
							{/each}
						{/if}
					</div>
				{/if}

				{#if selectedRequester}
					<div class="mt-2 rounded-md border bg-muted p-3">
						<div class="text-sm font-medium">{selectedRequester.name || 'No name'}</div>
						<div class="text-xs text-muted-foreground">
							{selectedRequester.email}
							{#if selectedRequester.phone}
								• {selectedRequester.phone}
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			{#if handleSave}
				<Button
					type="submit"
					onclick={() => {
						handleSave();
						open = false;
					}}>Save changes</Button
				>
			{:else}
				<Button onclick={() => (open = false)}>Save changes</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
