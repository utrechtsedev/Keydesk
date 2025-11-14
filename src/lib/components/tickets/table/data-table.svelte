<script lang="ts" generics="TData, TValue">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { FlexRender, createSvelteTable } from '$lib/components/ui/data-table/index.js';
	import {
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type RowSelectionState,
		type SortingState,
		type VisibilityState,
		getCoreRowModel
	} from '@tanstack/table-core';
	import Change from '$lib/icons/change.svelte';
	import Connection2 from '$lib/icons/connection-2.svelte';
	import Flag7 from '$lib/icons/flag-7.svelte';
	import Tags from '$lib/icons/tags.svelte';
	import Trash2 from '$lib/icons/trash-2.svelte';
	import Download from '$lib/icons/download.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		type Category,
		type Priority,
		type Status,
		type Tag,
		type Ticket,
		type User
	} from '$lib/types';
	import VShapedArrowDown from '$lib/icons/v-shaped-arrow-down.svelte';
	import ListTree from '$lib/icons/list-tree.svelte';
	import BulkActions from './data-bulk-actions-dialog.svelte';
	import ExportActions from './data-export-dialog.svelte';
	import DataDeleteDialog from './data-delete-dialog.svelte';
	import DataFilterDialog from './data-filter-dialog.svelte';
	import Gear3 from '$lib/icons/gear-3.svelte';
	type DataTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
		pageCount: number;
		totalCount: number;
		users: User[];
		categories: Category[];
		statuses: Status[];
		priorities: Priority[];
		tags: Tag[];
	};
	let {
		data,
		columns,
		pageCount,
		totalCount,
		users,
		categories,
		statuses,
		priorities,
		tags
	}: DataTableProps<TData, TValue> = $props();

	const currentPage = Number(page.url.searchParams.get('page')) || 1;
	const currentPageSize = Number(page.url.searchParams.get('pageSize')) || 10;
	const currentSortBy = page.url.searchParams.get('sortBy') || 'createdAt';
	const currentSortOrder = page.url.searchParams.get('sortOrder') || 'DESC';
	const currentSearch = page.url.searchParams.get('search') || '';
	let pageSizeValue = $state(String(currentPageSize));
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let globalFilter = $state<string>(currentSearch);
	let columnVisibility = $state<VisibilityState>({
		updatedAt: false,
		priority_name: false,
		firstResponseAt: false,
		resolvedAt: false
	});
	let searchTimeout: ReturnType<typeof setTimeout>;
	let sorting = $state<SortingState>([
		{ id: currentSortBy, desc: currentSortOrder.toUpperCase() === 'DESC' }
	]);
	let pagination = $state<PaginationState>({
		pageIndex: currentPage - 1,
		pageSize: currentPageSize
	});

	let exportDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let filterDialogOpen = $state(false);
	let bulkActions = $state<{
		title: string;
		description: string;
		ids: number[];
		open: boolean;
		items: User[] | Category[] | Status[] | Priority[] | Tag[];
		itemType: 'user' | 'category' | 'status' | 'priority' | 'tag';
	}>({
		title: '',
		description: '',
		ids: [],
		open: false,
		items: [],
		itemType: 'user'
	});

	$effect(() => {
		const urlPageSize = Number(page.url.searchParams.get('pageSize')) || 10;
		pageSizeValue = String(urlPageSize);
	});

	function getFilterParams(): string {
		const filters: string[] = [];
		const statusFilter = page.url.searchParams.get('status');
		const priorityFilter = page.url.searchParams.get('priority');
		const categoryFilter = page.url.searchParams.get('category');
		const assigneeFilter = page.url.searchParams.get('assignee');
		const dateFrom = page.url.searchParams.get('dateFrom');
		const dateTo = page.url.searchParams.get('dateTo');

		if (statusFilter) filters.push(`status=${statusFilter}`);
		if (priorityFilter) filters.push(`priority=${priorityFilter}`);
		if (categoryFilter) filters.push(`category=${categoryFilter}`);
		if (assigneeFilter) filters.push(`assignee=${assigneeFilter}`);
		if (dateFrom) filters.push(`dateFrom=${dateFrom}`);
		if (dateTo) filters.push(`dateTo=${dateTo}`);

		return filters.length > 0 ? `&${filters.join('&')}` : '';
	}

	function handlePageSizeChange(value: string | undefined) {
		if (!value) return;

		const newPageSize = Number(value);
		const sort = sorting[0];
		const sortParams = sort ? `&sortBy=${sort.id}&sortOrder=${sort.desc ? 'DESC' : 'ASC'}` : '';
		const searchParam = globalFilter ? `&search=${encodeURIComponent(globalFilter)}` : '';
		const filterParams = getFilterParams();

		goto(`?page=1&pageSize=${newPageSize}${sortParams}${searchParam}${filterParams}`);
	}

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		get pageCount() {
			return pageCount;
		},
		get rowCount() {
			return totalCount;
		},
		getRowId: (row) => String((row as Ticket).id),
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnFilters() {
				return columnFilters;
			},
			get globalFilter() {
				return globalFilter;
			}
		},
		manualPagination: true,
		getCoreRowModel: getCoreRowModel(),

		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}

			const urlPageSize = Number(page.url.searchParams.get('pageSize')) || 10;
			const sort = sorting[0];
			const sortParams = sort ? `&sortBy=${sort.id}&sortOrder=${sort.desc ? 'DESC' : 'ASC'}` : '';
			const searchParam = globalFilter ? `&search=${encodeURIComponent(globalFilter)}` : '';
			const filterParams = getFilterParams();

			goto(
				`?page=${pagination.pageIndex + 1}&pageSize=${urlPageSize}${sortParams}${searchParam}${filterParams}`
			);
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}

			const urlPageSize = Number(page.url.searchParams.get('pageSize')) || 10;
			const urlPage = Number(page.url.searchParams.get('page')) || 1;
			const sort = sorting[0];
			const searchParam = globalFilter ? `&search=${encodeURIComponent(globalFilter)}` : '';
			const filterParams = getFilterParams();

			if (sort) {
				goto(
					`?page=${urlPage}&pageSize=${urlPageSize}&sortBy=${sort.id}&sortOrder=${sort.desc ? 'DESC' : 'ASC'}${searchParam}${filterParams}`
				);
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		},
		onGlobalFilterChange: (updater) => {
			if (typeof updater === 'function') {
				globalFilter = updater(globalFilter);
			} else {
				globalFilter = updater;
			}

			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				const sort = sorting[0];
				const sortParams = sort ? `&sortBy=${sort.id}&sortOrder=${sort.desc ? 'DESC' : 'ASC'}` : '';
				const searchParam = globalFilter ? `&search=${encodeURIComponent(globalFilter)}` : '';
				const filterParams = getFilterParams();

				pagination = { pageIndex: 0, pageSize: pagination.pageSize };

				goto(`?page=1&pageSize=${pagination.pageSize}${sortParams}${searchParam}${filterParams}`, {
					replaceState: true,
					keepFocus: true,
					noScroll: true
				});
			}, 300);
		}
	});
</script>

<!-- Rest of template stays the same -->
<div class="w-full">
	<div class="flex items-center justify-between py-4">
		<Input
			placeholder="Search all columns..."
			value={globalFilter}
			oninput={(e) => table.setGlobalFilter(e.currentTarget.value)}
			class="max-w-sm"
		/>
		<div class="flex items-center gap-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" class="ml-auto">
							Actions <VShapedArrowDown class="ml-2 h-4 w-4" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-56" align="start">
					<DropdownMenu.Label>Actions</DropdownMenu.Label>
					<DropdownMenu.Group>
						<DropdownMenu.Item
							disabled={Object.keys(rowSelection).length === 0}
							onclick={() => {
								bulkActions = {
									title: 'Assign Ticket(s)',
									description: 'Choose a team member to assign to the selected ticket(s)',
									ids: Object.keys(rowSelection).map(Number),
									open: true,
									items: users,
									itemType: 'user'
								};
							}}
						>
							<Change class="mr-2 h-4 w-4" />
							Assign to
						</DropdownMenu.Item>
						<DropdownMenu.Item
							disabled={Object.keys(rowSelection).length === 0}
							onclick={() => {
								bulkActions = {
									title: 'Change Status',
									description: 'Update the status of the selected ticket(s)',
									ids: Object.keys(rowSelection).map(Number),
									open: true,
									items: statuses,
									itemType: 'status'
								};
							}}
						>
							<Connection2 class="mr-2 h-4 w-4" />
							Change status
						</DropdownMenu.Item>
						<DropdownMenu.Item
							disabled={Object.keys(rowSelection).length === 0}
							onclick={() => {
								bulkActions = {
									title: 'Change Priority',
									description: 'Set the priority level for the selected ticket(s)',
									ids: Object.keys(rowSelection).map(Number),
									open: true,
									items: priorities,
									itemType: 'priority'
								};
							}}
						>
							<Flag7 class="mr-2 h-4 w-4" />
							Change priority
						</DropdownMenu.Item>
						<DropdownMenu.Item
							disabled={Object.keys(rowSelection).length === 0}
							onclick={() => {
								bulkActions = {
									title: 'Change Category',
									description: 'Categorize the selected ticket(s)',
									ids: Object.keys(rowSelection).map(Number),
									open: true,
									items: categories,
									itemType: 'category'
								};
							}}
						>
							<ListTree class="mr-2 h-4 w-4" />
							Change Category
						</DropdownMenu.Item>
						<DropdownMenu.Item
							disabled={Object.keys(rowSelection).length === 0}
							onclick={() => {
								bulkActions = {
									title: 'Change Tags',
									description: 'Tag the selected ticket(s)',
									ids: Object.keys(rowSelection).map(Number),
									open: true,
									items: tags,
									itemType: 'tag'
								};
							}}
						>
							<Tags class="mr-2 h-4 w-4" />
							Add tags
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => (exportDialogOpen = true)}>
							<Download class="mr-2 h-4 w-4" />
							Export
						</DropdownMenu.Item>
						<DropdownMenu.Item
							disabled={Object.keys(rowSelection).length === 0}
							onclick={() => (deleteDialogOpen = true)}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" class="ml-auto">
							Columns <VShapedArrowDown class="ml-2 h-4 w-4" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					{#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column)}
						<DropdownMenu.CheckboxItem
							class="capitalize"
							bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
							onSelect={(e) => {
								e.preventDefault();
								column.toggleVisibility();
							}}
						>
							{column.columnDef.meta?.title ?? column.id}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Button variant="outline" size="sm" onclick={() => (filterDialogOpen = true)}
				><Gear3 class="" /></Button
			>
		</div>
	</div>

	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#each headerGroup.headers as header (header.id)}
							<Table.Head class="[&:has([role=checkbox])]:pl-3">
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>

			<Table.Body>
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row
						data-state={row.getIsSelected() && 'selected'}
						onclick={(e: MouseEvent) => {
							const target = e.target as HTMLElement;
							if (target.closest('[role="checkbox"]') || target.closest('[data-cell-actions]')) {
								return;
							}
							goto(`/dashboard/tickets/${(row.original as Ticket).id}`);
						}}
					>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell class="[&:has([role=checkbox])]:pl-3">
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center">No results.</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="flex items-center justify-between pt-4">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Select.Root type="single" value={pageSizeValue} onValueChange={handlePageSizeChange}>
					<Select.Trigger class="h-8 w-[70px]">
						{pageSizeValue}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10">10</Select.Item>
						<Select.Item value="20">20</Select.Item>
						<Select.Item value="50">50</Select.Item>
						<Select.Item value="100">100</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="text-sm text-muted-foreground">
				{Object.keys(rowSelection).length} of {totalCount} row(s) selected.
			</div>
		</div>
		<div class="flex items-center gap-2">
			<div class="text-sm text-muted-foreground">
				Page {pagination.pageIndex + 1} of {pageCount}
			</div>
			<div class="space-x-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
				</Button>
			</div>
		</div>
	</div>
</div>

<BulkActions
	title={bulkActions.title}
	description={bulkActions.description}
	items={bulkActions.items}
	bind:open={bulkActions.open}
	ids={bulkActions.ids}
	itemType={bulkActions.itemType}
/>

<ExportActions {statuses} {categories} {priorities} {users} bind:open={exportDialogOpen} />
<DataDeleteDialog bind:open={deleteDialogOpen} ids={Object.keys(rowSelection).map(Number)} />
<DataFilterDialog {statuses} {categories} {priorities} {users} bind:open={filterDialogOpen} />
