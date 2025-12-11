<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { ToastComponent } from '$lib/components/ui/toast';
	import type { Category, Priority, Status, User } from '$lib/types';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import Download from '$lib/icons/download.svelte';
	import { Spinner } from '$lib/components/ui/spinner';

	let {
		open = $bindable(),
		statuses,
		priorities,
		categories,
		users
	}: {
		open: boolean;
		statuses: Status[];
		priorities: Priority[];
		categories: Category[];
		users: User[];
	} = $props();

	let search = $state('');
	let selectedStatus = $state<string>('all');
	let selectedPriority = $state<string>('all');
	let selectedCategory = $state<string>('all');
	let selectedAssignee = $state<string>('all');
	let dateFrom = $state('');
	let dateTo = $state('');
	let includeResolved = $state(true);
	let isExporting = $state(false);

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
	const categoryOption = $derived(
		selectedCategory === 'all'
			? 'All Categories'
			: (categories.find((c) => String(c.id) === selectedCategory)?.name ?? 'All Categories')
	);
	const assigneeOption = $derived(
		selectedAssignee === 'all'
			? 'All Assignees'
			: selectedAssignee === 'unassigned'
				? 'Unassigned'
				: (users.find((u) => String(u.id) === selectedAssignee)?.name ?? 'All Assignees')
	);

	function buildExportUrl(): string {
		const params = new URLSearchParams();

		if (search.trim()) params.append('search', search.trim());
		if (selectedStatus !== 'all') params.append('status', selectedStatus);
		if (selectedPriority !== 'all') params.append('priority', selectedPriority);
		if (selectedCategory !== 'all') params.append('category', selectedCategory);
		if (selectedAssignee !== 'all') params.append('assignee', selectedAssignee);
		if (dateFrom) params.append('dateFrom', dateFrom);
		if (dateTo) params.append('dateTo', dateTo);
		if (!includeResolved) params.append('includeResolved', 'false');

		return `/api/tickets/export?${params.toString()}`;
	}

	async function handleExport() {
		isExporting = true;
		try {
			const url = buildExportUrl();

			const response = await axios.get(url, {
				responseType: 'blob'
			});

			const contentDisposition = response.headers['content-disposition'];
			let filename = `tickets-export-${Date.now()}.csv`;
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
				if (filenameMatch) {
					filename = filenameMatch[1];
				}
			}

			const blob = new Blob([response.data], { type: 'text/csv' });
			const downloadUrl = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(downloadUrl);

			toast.success('Export completed successfully.');
			open = false;
			resetFilters();
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return toast.error(ToastComponent, {
					componentProps: {
						title: error.response.data.message || 'Export failed',
						body: error.response.data.error || 'Unknown error'
					}
				});
			}
			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Export failed',
					body: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		} finally {
			isExporting = false;
		}
	}

	function resetFilters() {
		search = '';
		selectedStatus = 'all';
		selectedPriority = 'all';
		selectedCategory = 'all';
		selectedAssignee = 'all';
		dateFrom = '';
		dateTo = '';
		includeResolved = true;
	}

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen && !isExporting) {
			resetFilters();
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Export Tickets</Dialog.Title>
			<Dialog.Description>Configure filters and export tickets to CSV format.</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-6 py-4">
			<div class="grid gap-2">
				<Label for="export-search">Search</Label>
				<Input
					id="export-search"
					placeholder="Search by ticket number, subject, or description..."
					bind:value={search}
					disabled={isExporting}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="export-status">Status</Label>
					<Select.Root type="single" bind:value={selectedStatus} disabled={isExporting}>
						<Select.Trigger id="export-status">
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
					<Label for="export-priority">Priority</Label>
					<Select.Root type="single" bind:value={selectedPriority} disabled={isExporting}>
						<Select.Trigger id="export-priority">
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

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="export-category">Category</Label>
					<Select.Root type="single" bind:value={selectedCategory} disabled={isExporting}>
						<Select.Trigger id="export-category">
							{categoryOption}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All Categories</Select.Item>
							{#each categories as category (category.id)}
								<Select.Item value={String(category.id)}>
									{category.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="grid gap-2">
					<Label for="export-assignee">Assignee</Label>
					<Select.Root type="single" bind:value={selectedAssignee} disabled={isExporting}>
						<Select.Trigger id="export-assignee">
							{assigneeOption}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All Assignees</Select.Item>
							<Select.Item value="unassigned">Unassigned</Select.Item>
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
					<Label for="export-date-from">Date From</Label>
					<Input id="export-date-from" type="date" bind:value={dateFrom} disabled={isExporting} />
				</div>
				<div class="grid gap-2">
					<Label for="export-date-to">Date To</Label>
					<Input id="export-date-to" type="date" bind:value={dateTo} disabled={isExporting} />
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<Checkbox
					id="export-include-resolved"
					bind:checked={includeResolved}
					disabled={isExporting}
				/>
				<Label
					for="export-include-resolved"
					class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Include resolved tickets
				</Label>
			</div>

			<div class="text-sm text-muted-foreground">
				{#if search || selectedStatus !== 'all' || selectedPriority !== 'all' || selectedCategory !== 'all' || selectedAssignee !== 'all' || dateFrom || dateTo || !includeResolved}
					<p>Active filters will be applied to the export.</p>
				{:else}
					<p>All tickets will be exported (no filters applied).</p>
				{/if}
			</div>
		</div>

		<Dialog.Footer class="gap-2">
			<Button
				variant="outline"
				onclick={() => {
					open = false;
					resetFilters();
				}}
				disabled={isExporting}
			>
				Cancel
			</Button>
			<Button onclick={handleExport} disabled={isExporting}>
				{#if isExporting}
					<Spinner />
					Exporting...
				{:else}
					<Download class="invert dark:invert-0" />
					Export to CSV
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
