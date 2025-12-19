<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { Priority, Status, User } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	let {
		open = $bindable(),
		statuses,
		priorities,
		users
	}: {
		open: boolean;
		statuses: Status[];
		priorities: Priority[];
		users: User[];
	} = $props();

	const currentStatus = page.url.searchParams.get('status') || 'all';
	const currentPriority = page.url.searchParams.get('priority') || 'all';
	const currentAssignee = page.url.searchParams.get('assignee') || 'all';
	const currentDateFrom = page.url.searchParams.get('dateFrom') || '';
	const currentDateTo = page.url.searchParams.get('dateTo') || '';

	let selectedStatus = $state<string>(currentStatus);
	let selectedPriority = $state<string>(currentPriority);
	let selectedAssignee = $state<string>(currentAssignee);
	let dateFrom = $state(currentDateFrom);
	let dateTo = $state(currentDateTo);

	const statusOption = $derived(
		selectedStatus === 'all'
			? 'All Statuses'
			: (statuses.find((s) => String(s.id) === selectedStatus)?.name ?? 'All Statuses')
	);
	const priorityOption = $derived(
		selectedPriority === 'all'
			? 'All Priorities'
			: (priorities.find((p) => String(p.id) === selectedPriority)?.name ?? 'All Priorities')
	);
	const assigneeOption = $derived(
		selectedAssignee === 'all'
			? 'All Assignees'
			: selectedAssignee === 'unassigned'
				? 'Unassigned'
				: (users.find((u) => String(u.id) === selectedAssignee)?.name ?? 'All Assignees')
	);

	function handleApplyFilters() {
		const params = new SvelteURLSearchParams(page.url.searchParams);

		params.delete('status');
		params.delete('priority');
		params.delete('assignee');
		params.delete('dateFrom');
		params.delete('dateTo');

		if (selectedStatus !== 'all') params.set('status', selectedStatus);
		if (selectedPriority !== 'all') params.set('priority', selectedPriority);
		if (selectedAssignee !== 'all') params.set('assignee', selectedAssignee);
		if (dateFrom) params.set('dateFrom', dateFrom);
		if (dateTo) params.set('dateTo', dateTo);

		goto(`?${params.toString()}`);
		open = false;
	}

	function handleReset() {
		const params = new SvelteURLSearchParams(page.url.searchParams);

		params.delete('status');
		params.delete('priority');
		params.delete('assignee');
		params.delete('dateFrom');
		params.delete('dateTo');

		goto(`?${params.toString()}`);

		selectedStatus = 'all';
		selectedPriority = 'all';
		selectedAssignee = 'all';
		dateFrom = '';
		dateTo = '';

		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Filter Tasks</Dialog.Title>
			<Dialog.Description>Apply filters to narrow down your task view.</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-6 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="filter-status">Status</Label>
					<Select.Root type="single" bind:value={selectedStatus}>
						<Select.Trigger id="filter-status">
							{statusOption}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All Statuses</Select.Item>
							{#each statuses as status (status.id)}
								<Select.Item value={String(status.id)}>
									{status.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="grid gap-2">
					<Label for="filter-priority">Priority</Label>
					<Select.Root type="single" bind:value={selectedPriority}>
						<Select.Trigger id="filter-priority">
							{priorityOption}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All Priorities</Select.Item>
							{#each priorities as priority (priority.id)}
								<Select.Item value={String(priority.id)}>
									{priority.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="grid gap-2">
				<Label for="filter-assignee">Assignee</Label>
				<Select.Root type="single" bind:value={selectedAssignee}>
					<Select.Trigger id="filter-assignee">
						{assigneeOption}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all">All Assignees</Select.Item>
						{#each users as user (user.id)}
							<Select.Item value={String(user.id)}>
								{user.name}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div class="grid gap-2">
				<Label for="filter-date-from">Date From</Label>
				<Input id="filter-date-from" type="date" bind:value={dateFrom} />
			</div>
			<div class="grid gap-2">
				<Label for="filter-date-to">Date To</Label>
				<Input id="filter-date-to" type="date" bind:value={dateTo} />
			</div>
		</div>

		<div class="text-sm text-muted-foreground">
			{#if selectedStatus !== 'all' || selectedPriority !== 'all' || selectedAssignee !== 'all' || dateFrom || dateTo}
				<p>Active filters will be applied to the tables.</p>
			{:else}
				<p>No filters applied - showing all tasks.</p>
			{/if}
		</div>

		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={handleReset}>Reset Filters</Button>
			<Button onclick={handleApplyFilters}>Apply Filters</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
