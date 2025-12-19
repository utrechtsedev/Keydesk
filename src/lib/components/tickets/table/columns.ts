import { renderComponent, renderSnippet } from '$lib/components/ui/data-table';
import type { TicketList } from '$lib/types';
import type { ColumnDef } from '@tanstack/table-core';
import { createRawSnippet } from 'svelte';
import DataTableCheckbox from './data-table-checkbox.svelte';
import DataTableActions from './data-table-actions.svelte';
import { darkenColor } from '$lib/utils/color';
import DataTableSortButton from './data-table-sort-button.svelte';

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    title?: string;
  }
}

export const columns: ColumnDef<TicketList>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      renderComponent(DataTableCheckbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
        onCheckedChange: (value: boolean) => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
    cell: ({ row }) =>
      renderComponent(DataTableCheckbox, {
        checked: row.getIsSelected(),
        onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      }),
    enableSorting: false,
    enableGlobalFilter: false,
    enableHiding: false,
    meta: {
      title: ''
    }
  },
  {
    id: 'ticket-number',
    accessorKey: 'ticketNumber',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'No.',
      }),
    meta: {
      title: 'No.'
    },
    enableHiding: false
  },
  {
    id: 'requester-name',
    accessorKey: 'requester.name',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Requester'
      }),
    cell: ({ row }) => {
      if (!row.original.requester.name) return '-';
      return row.original.requester.name;
    },
    meta: {
      title: 'Requester'
    },
  },
  {
    id: 'subject',
    accessorKey: 'subject',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Subject'
      }),
    meta: {
      title: 'Subject'
    }
  },
  {
    id: 'category-name',
    accessorKey: 'category.name',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Category'
      }),
    enableGlobalFilter: false,
    meta: {
      title: 'Category'
    }
  },
  {
    id: 'user-name',
    accessorKey: 'user.name',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Assignee'
      }),
    cell: ({ row }) => {
      if (!row.original.assignedUser) return '-';
      return row.original.assignedUser.name;
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Assignee'
    }
  },
  {
    id: 'status-name',
    accessorKey: 'status.name',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Status'
      }),
    cell: ({ row }) => {
      const statusCellSnippet = createRawSnippet(() => ({
        render: () => `<div class="flex items-center" style="color: ${row.original.status.color};"><div style="background-color: ${darkenColor(row.original.status.color, 20)};" class="w-1.5 h-1.5 rounded-full mr-1"></div><span>${row.original.status.name}</span></div>`
      }));
      return renderSnippet(statusCellSnippet);
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Status'
    },
  },
  {
    id: 'priority-name',
    accessorKey: 'priority.name',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Priority'
      }),
    cell: ({ row }) => {
      const statusCellSnippet = createRawSnippet(() => ({
        render: () => `<div class="flex items-center" style="color: ${row.original.priority.color};"><div style="background-color: ${darkenColor(row.original.priority.color, 20)};" class="w-1.5 h-1.5 rounded-full mr-1"></div><span>${row.original.priority.name}</span></div>`
      }));
      return renderSnippet(statusCellSnippet);
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Priority'
    },
  },
  {
    id: 'resolved-at',
    accessorKey: 'resolvedAt',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Resolved At'
      }),
    cell: ({ row }) => {
      const timestamp = row.original.resolvedAt;
      if (!timestamp) return '-';

      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Resolved At'
    }
  },
  {
    id: 'first-response-at',
    accessorKey: 'firstResponseAt',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'First Response'
      }),
    cell: ({ row }) => {
      const timestamp = row.original.firstResponseAt;
      if (!timestamp) return '-';

      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    enableGlobalFilter: false,
    meta: {
      title: 'First Response'
    }
  },
  {
    id: 'created-at',
    accessorKey: 'createdAt',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Received At'
      }),
    cell: ({ row }) => {
      const timestamp = row.original.createdAt;
      if (!timestamp) return '-';

      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Received At'
    }
  },
  {
    id: 'updated-at',
    accessorKey: 'updatedAt',
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: 'Updated At'
      }),
    cell: ({ row }) => {
      const timestamp = row.original.updatedAt;
      if (!timestamp) return '-';

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Updated At'
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return renderComponent(DataTableActions, { id: row.original.ticketNumber });
    },
    enableGlobalFilter: false,
    enableHiding: false,
  },
];
