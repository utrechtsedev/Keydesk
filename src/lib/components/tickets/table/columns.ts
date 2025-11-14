import { renderComponent, renderSnippet } from "$lib/components/ui/data-table";
import type { TicketList } from "$lib/types";
import type { ColumnDef } from "@tanstack/table-core";
import { createRawSnippet } from "svelte";
import DataTableCheckbox from './data-table-checkbox.svelte';
import DataTableActions from './data-table-actions.svelte';
import { darkenColor } from "$lib/utils/color";
import DataTableSortButton from "./data-table-sort-button.svelte";

declare module '@tanstack/table-core' {
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
        onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
    cell: ({ row }) =>
      renderComponent(DataTableCheckbox, {
        checked: row.getIsSelected(),
        onCheckedChange: (value) => row.toggleSelected(!!value),
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
    accessorKey: "ticketNumber",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `No.`
      }),
    meta: {
      title: 'Ticket Number'
    },
    enableHiding: false
  },
  {
    accessorKey: "requester.name",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Requester`
      }),
    cell: ({ row }) => {
      if (!row.original.requester.name) return '-'
      return row.original.requester.name
    },
    meta: {
      title: 'Requester'
    },
  },
  {
    accessorKey: "subject",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Subject`
      }),
    meta: {
      title: 'Subject'
    }
  },
  {
    accessorKey: "category.name",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Category`
      }),
    enableGlobalFilter: false,
    meta: {
      title: 'Category'
    }
  },
  {
    accessorKey: "user.name",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Assignee`
      }),
    cell: ({ row }) => {
      if (!row.original.assignedUser) return '-'
      return row.original.assignedUser.name
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Assignee'
    }
  },
  {
    accessorKey: "status.name",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Status`
      }),
    cell: ({ row }) => {
      const statusCellSnippet = createRawSnippet(() => ({
        render: () => `<div class="flex items-center" style="color: ${row.original.status.color};"><div style="background-color: ${darkenColor(row.original.status.color, 20)};" class="w-1.5 h-1.5 rounded-full mr-1"></div><span>${row.original.status.name}</span></div>`
      }))
      return renderSnippet(statusCellSnippet)
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Status'
    },
  },
  {
    accessorKey: "priority.name",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Priority`
      }),
    cell: ({ row }) => {
      const statusCellSnippet = createRawSnippet(() => ({
        render: () => `<div class="flex items-center" style="color: ${row.original.priority.color};"><div style="background-color: ${darkenColor(row.original.priority.color, 20)};" class="w-1.5 h-1.5 rounded-full mr-1"></div><span>${row.original.priority.name}</span></div>`
      }))
      return renderSnippet(statusCellSnippet)
    },
    enableGlobalFilter: false,
    meta: {
      title: 'Priority'
    },
  },
  {
    accessorKey: "resolvedAt",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Resolved At`
      }),
    cell: ({ row }) => {
      const timestamp = row.original.resolvedAt;
      if (!timestamp) return "-";

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
    accessorKey: "firstResponseAt",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `First Response`
      }),
    cell: ({ row }) => {
      const timestamp = row.original.firstResponseAt;
      if (!timestamp) return "-";

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
    accessorKey: "createdAt",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Received At`
      }),
    cell: ({ row }) => {
      const timestamp = row.original.createdAt;
      if (!timestamp) return "-";

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
    accessorKey: "updatedAt",
    header: ({ column }) =>
      renderComponent(DataTableSortButton, {
        onclick: column.getToggleSortingHandler(), text: `Updated At`
      }),
    cell: ({ row }) => {
      const timestamp = row.original.updatedAt;
      if (!timestamp) return "-";

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
    id: "actions",
    cell: ({ row }) => {
      // You can pass whatever you need from `row.original` to the component
      return renderComponent(DataTableActions, { id: row.original.ticketNumber });
    },
    enableGlobalFilter: false,
    enableHiding: false,
  },
];
