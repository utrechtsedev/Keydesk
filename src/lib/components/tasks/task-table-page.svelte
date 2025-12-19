<script lang="ts">
	import Gear3 from '$lib/icons/gear-3.svelte';
	import TaskTable from '$lib/components/tasks/task-table.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { TaskPageData } from '$lib/types';
	import TaskFilterDialog from '$lib/components/tasks/task-filter-dialog.svelte';
	import TaskSheet from './task-sheet.svelte';

	const { data }: { data: TaskPageData } = $props();

	let filterDialogOpen = $state(false);

	let tasks = $derived(data.tasks.filter((t) => !t.parentTaskId));

	const parentTasks = $derived(tasks.filter((t) => !t.parentTaskId));

	let openTaskSheet = $state(false);
</script>

<div class="space-y-4">
	<div class="flex items-end justify-between">
		<span class="text-2xl font-extrabold">Tasks</span>
		<div class="flex items-center space-x-3">
			<Button size="sm" onclick={() => (openTaskSheet = true)}>New Task</Button>
			<Button variant="outline" onclick={() => (filterDialogOpen = true)}><Gear3 /></Button>
		</div>
	</div>

	<div class="w-full">
		<TaskTable
			priorities={data.priorities}
			statuses={data.statuses}
			{parentTasks}
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

<TaskSheet
	statuses={data.statuses}
	priorities={data.priorities}
	{parentTasks}
	task={null}
	users={data.users}
	bind:open={openTaskSheet}
/>
