<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import VShapedArrowDown from '$lib/icons/v-shaped-arrow-down.svelte';
	import Change from '$lib/icons/change.svelte';
	import Connection2 from '$lib/icons/connection-2.svelte';
	import Flag7 from '$lib/icons/flag-7.svelte';
	import ListTree from '$lib/icons/list-tree.svelte';
	import Download from '$lib/icons/download.svelte';
	import Tags from '$lib/icons/tags.svelte';
	import Trash2 from '$lib/icons/trash-2.svelte';
	import Gear3 from '$lib/icons/gear-3.svelte';
	import TaskTable from '$lib/components/tasks/task-table.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { TaskPageData } from '$lib/types';
	import TaskFilterDialog from '$lib/components/tasks/task-filter-dialog.svelte';

	const { data }: { data: TaskPageData } = $props();

	let filterDialogOpen = $state(false);

	let tasks = $derived(data.tasks.filter((t) => !t.parentTaskId));
	let finishedTasks = $derived(
		data.finishedTasks.filter((t) => t.subtasks && t.subtasks.length > 0)
	);
</script>

<div class="space-y-4">
	<div class="flex items-end justify-between">
		<span class="text-2xl font-extrabold">Tasks</span>
		<div class="flex items-center space-x-3">
			<Button size="sm">New Task</Button>
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
						<DropdownMenu.Item onclick={() => {}}>
							<Change class="mr-2 h-4 w-4" />
							Assign to
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => {}}>
							<Connection2 class="mr-2 h-4 w-4" />
							Change status
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => {}}>
							<Flag7 class="mr-2 h-4 w-4" />
							Change priority
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => {}}>
							<ListTree class="mr-2 h-4 w-4" />
							Change Category
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => {}}>
							<Tags class="mr-2 h-4 w-4" />
							Add tags
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => {}}>
							<Download class="mr-2 h-4 w-4" />
							Export
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => {}}>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Button variant="outline" onclick={() => (filterDialogOpen = true)}><Gear3 /></Button>
		</div>
	</div>

	<div class="w-full">
		<TaskTable
			{tasks}
			task={data.task}
			priorities={data.priorities}
			statuses={data.statuses}
			users={data.users}
		/>
	</div>
</div>

<TaskFilterDialog
	statuses={data.statuses}
	priorities={data.priorities}
	bind:open={filterDialogOpen}
	users={data.users}
/>
