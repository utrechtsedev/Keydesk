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
		type ColumnOrderState,
		getCoreRowModel
	} from '@tanstack/table-core';
	import {
		DndContext,
		DragOverlay,
		type DragStartEvent,
		type DragOverEvent
	} from '@dnd-kit-svelte/core';
	import {
		SortableContext,
		arrayMove,
		horizontalListSortingStrategy
	} from '@dnd-kit-svelte/sortable';
	import { sensors } from '$lib/utils/sensors';
	import SortableTableHeader from './ticket-sortable-table-header.svelte';
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
	import BulkActions from './ticket-bulk-actions-dialog.svelte';
	import ExportActions from './ticket-export-dialog.svelte';
	import DataDeleteDialog from './ticket-delete-dialog.svelte';
	import DataFilterDialog from './ticket-filter-dialog.svelte';
	import Gear3 from '$lib/icons/gear-3.svelte';
	import { browser } from '$app/environment';
	import Check from '$lib/icons/check.svelte';

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

	// LocalStorage keys
	const COLUMN_ORDER_KEY = 'table-column-order';
	const COLUMN_VISIBILITY_KEY = 'table-column-visibility';

	// Helper functions for localStorage
	function saveToLocalStorage(key: string, value: unknown) {
		if (!browser) return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.error('Failed to save to localStorage:', error);
		}
	}

	function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
		if (!browser) return defaultValue;
		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : defaultValue;
		} catch (error) {
			console.error('Failed to load from localStorage:', error);
			return defaultValue;
		}
	}

	// URL params
	const currentPage = Number(page.url.searchParams.get('page')) || 1;
	const currentPageSize = Number(page.url.searchParams.get('pageSize')) || 10;
	const currentSortBy = page.url.searchParams.get('sortBy') || 'createdAt';
	const currentSortOrder = page.url.searchParams.get('sortOrder') || 'DESC';
	const currentSearch = page.url.searchParams.get('search') || '';

	// State
	let activeColumn = $state<string | null>(null);
	let pageSizeValue = $state(String(currentPageSize));
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let globalFilter = $state<string>(currentSearch);
	let columnOrder = $state<ColumnOrderState>(loadFromLocalStorage(COLUMN_ORDER_KEY, []));
	let columnVisibility = $state<VisibilityState>(
		loadFromLocalStorage(COLUMN_VISIBILITY_KEY, {
			updatedAt: false,
			'priority-name': false,
			'first-response-at': false,
			'resolved-at': false
		})
	);
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

	// Effects
	$effect(() => {
		const urlPageSize = Number(page.url.searchParams.get('pageSize')) || 10;
		pageSizeValue = String(urlPageSize);
	});

	// Initialize column order after table is created
	$effect(() => {
		if (columnOrder.length === 0) {
			columnOrder = table
				.getAllColumns()
				.map((col) => col.id)
				.filter((id) => id !== 'select' && id !== 'actions');
		}
	});

	// Save column order to localStorage
	$effect(() => {
		if (columnOrder.length > 0) {
			saveToLocalStorage(COLUMN_ORDER_KEY, columnOrder);
		}
	});

	// Save column visibility to localStorage
	$effect(() => {
		saveToLocalStorage(COLUMN_VISIBILITY_KEY, columnVisibility);
	});

	// Load column visibility from localStorage
	$effect(() => {
		if (browser) {
			const saved = loadFromLocalStorage(COLUMN_VISIBILITY_KEY, null);
			if (saved) {
				columnVisibility = saved;
			}
		}
	});

	// Helper functions
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

	function handleDragStart({ active }: DragStartEvent) {
		activeColumn = active.id as string;
	}

	function handleDragOver({ active, over }: DragOverEvent) {
		// Optional: Add visual feedback during drag
		if (!over || active.id === over.id) return;

		// Skip if over non-draggable columns
		if (over.id === 'select' || over.id === 'actions') return;

		const oldIndex = columnOrder.indexOf(active.id as string);
		const newIndex = columnOrder.indexOf(over.id as string);

		// Reorder in real-time as you drag over
		if (oldIndex !== -1 && newIndex !== -1) {
			columnOrder = arrayMove(columnOrder, oldIndex, newIndex);
		}
	}

	function handleDragEnd() {
		activeColumn = null;
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

	// Table instance
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
			},
			get columnOrder() {
				return columnOrder;
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
		},
		onColumnOrderChange: (updater) => {
			if (typeof updater === 'function') {
				columnOrder = updater(columnOrder);
			} else {
				columnOrder = updater;
			}
		}
	});
</script>

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
					{#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
						<DropdownMenu.Item
							class="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8"
							onSelect={(e) => {
								e.preventDefault();
								column.toggleVisibility();
							}}
						>
							<span class="absolute left-2 flex size-3.5 items-center justify-center">
								{#if columnVisibility[column.id] ?? true}
									<Check class="size-4" />
								{/if}
							</span>
							<span class="capitalize">{column.columnDef.meta?.title ?? column.id}</span>
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Button variant="outline" onclick={() => (filterDialogOpen = true)}><Gear3 /></Button>
		</div>
	</div>

	<div class="rounded-md border">
		<DndContext
			{sensors}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<Table.Root>
				<Table.Header>
					{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
						{@const selectHeader = headerGroup.headers.find((h) => h.id === 'select')}
						{@const actionsHeader = headerGroup.headers.find((h) => h.id === 'actions')}
						{@const draggableHeaders = headerGroup.headers.filter(
							(h) => h.id !== 'select' && h.id !== 'actions'
						)}

						<Table.Row>
							<!-- Select column (non-draggable, ALWAYS FIRST) -->
							{#if selectHeader}
								<Table.Head class="[&:has([role=checkbox])]:pl-3">
									{#if !selectHeader.isPlaceholder}
										<FlexRender
											content={selectHeader.column.columnDef.header}
											context={selectHeader.getContext()}
										/>
									{/if}
								</Table.Head>
							{/if}

							<!-- Draggable columns in the middle -->
							<SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
								{#each draggableHeaders as header (header.id)}
									<SortableTableHeader id={header.id}>
										{#if !header.isPlaceholder}
											<FlexRender
												content={header.column.columnDef.header}
												context={header.getContext()}
											/>
										{/if}
									</SortableTableHeader>
								{/each}
							</SortableContext>

							<!-- Actions column (non-draggable, ALWAYS LAST) -->
							{#if actionsHeader}
								<Table.Head>
									{#if !actionsHeader.isPlaceholder}
										<FlexRender
											content={actionsHeader.column.columnDef.header}
											context={actionsHeader.getContext()}
										/>
									{/if}
								</Table.Head>
							{/if}
						</Table.Row>
					{/each}
				</Table.Header><Table.Body>
					{#each table.getRowModel().rows as row (row.id)}
						{@const selectCell = row.getVisibleCells().find((c) => c.column.id === 'select')}
						{@const actionsCell = row.getVisibleCells().find((c) => c.column.id === 'actions')}
						{@const draggableCells = row
							.getVisibleCells()
							.filter((c) => c.column.id !== 'select' && c.column.id !== 'actions')}

						<Table.Row
							data-state={row.getIsSelected() && 'selected'}
							onclick={(e) => {
								const target = e.target as HTMLElement;
								if (target.closest('[role="checkbox"]') || target.closest('[data-cell-actions]')) {
									return;
								}
								goto(`/dashboard/tickets/${(row.original as Ticket).id}`);
							}}
						>
							<!-- Select cell (always first) -->
							{#if selectCell}
								<Table.Cell class="[&:has([role=checkbox])]:pl-3">
									<FlexRender
										content={selectCell.column.columnDef.cell}
										context={selectCell.getContext()}
									/>
								</Table.Cell>
							{/if}

							<!-- Draggable cells in order -->
							{#each draggableCells as cell (cell.id)}
								<Table.Cell class="[&:has([role=checkbox])]:pl-3">
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								</Table.Cell>
							{/each}

							<!-- Actions cell (always last) -->
							{#if actionsCell}
								<Table.Cell>
									<FlexRender
										content={actionsCell.column.columnDef.cell}
										context={actionsCell.getContext()}
									/>
								</Table.Cell>
							{/if}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={columns.length} class="h-24 text-center">No results.</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			<DragOverlay>
				{#if activeColumn}
					{@const column = table.getAllColumns().find((col) => col.id === activeColumn)}
					{@const title = column?.columnDef.meta?.title || activeColumn}
					<div class="rounded-md border bg-background px-4 py-2 font-medium opacity-90 shadow-lg">
						{title}
					</div>
				{/if}
			</DragOverlay>
		</DndContext>
	</div>

	<div class="flex items-center justify-between pt-4">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Select.Root type="single" value={pageSizeValue} onValueChange={handlePageSizeChange}>
					<Select.Trigger class="h-8 w-17.5">
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
