<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Table from '$lib/components/ui/table';
	import { ChevronRight } from '@lucide/svelte';
	import type { Priority, Status, Task, User } from '$lib/types';
	import { formatRelativeDate } from '$lib/utils/date';
	import TaskSheet from './task-sheet.svelte';
	import ChevronDown from '$lib/icons/chevron-down.svelte';

	const {
		tasks,
		users,
		priorities,
		statuses,
		enableStatus = true,
		enablePriority = true
	}: {
		tasks: Task[];
		users: User[];
		statuses: Status[];
		priorities: Priority[];
		enableStatus?: boolean;
		enablePriority?: boolean;
	} = $props();

	let currentTask = $state({
		open: false,
		task: null as Task | null
	});

	// Filter only parent tasks
	const parentTasks = $derived(tasks.filter((t) => !t.parentTaskId));

	// Get all task IDs (including subtasks for potential selection)
	const allTaskIds = $derived(tasks.map((t) => t.id));

	let selectedTasks = $state<Array<number>>([]);
	let expandedTasks = $state<Record<number, boolean>>({});

	// Check if all tasks are selected
	const allSelected = $derived(
		allTaskIds.length > 0 && allTaskIds.every((id) => selectedTasks.includes(id))
	);

	// Check if some (but not all) tasks are selected
	const someSelected = $derived(
		selectedTasks.length > 0 && selectedTasks.length < allTaskIds.length
	);

	let showAllTasks = $state<boolean>(false);
	const displayedTasks = $derived(showAllTasks ? parentTasks : parentTasks.slice(0, 8));

	function toggleExpand(taskId: number, event: MouseEvent) {
		event.stopPropagation();
		expandedTasks[taskId] = !expandedTasks[taskId];
	}

	function toggleTask(taskId: number) {
		if (selectedTasks.includes(taskId)) {
			selectedTasks = selectedTasks.filter((id) => id !== taskId);
		} else {
			selectedTasks = [...selectedTasks, taskId];
		}
	}

	function toggleAll() {
		if (allSelected) {
			selectedTasks = [];
		} else {
			selectedTasks = [...allTaskIds];
		}
	}
</script>

<div class="w-full overflow-hidden">
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-12 [&:has([role=checkbox])]:ps-3">
						<Checkbox
							checked={allSelected}
							indeterminate={someSelected}
							onCheckedChange={toggleAll}
						/>
					</Table.Head>
					<Table.Head class="max-w-[40%] min-w-[40%]">Title</Table.Head>
					{#if enableStatus}
						<Table.Head class="max-w-[15%] min-w-[15%]">Status</Table.Head>
					{/if}
					{#if enablePriority}
						<Table.Head class="max-w-[15%] min-w-[15%]">Priority</Table.Head>
					{/if}
					<Table.Head class="max-w-[20%] min-w-[20%]">Due</Table.Head>
					<Table.Head class="max-w-[10%] min-w-[10%]"
						><span class="sr-only">Expand</span></Table.Head
					>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each displayedTasks as task}
					<!-- Parent task row -->
					<Table.Row class="cursor-pointer" onclick={() => (currentTask = { open: true, task })}>
						<Table.Cell class="[&:has([role=checkbox])]:ps-3" onclick={(e) => e.stopPropagation()}>
							<Checkbox
								checked={selectedTasks.includes(task.id)}
								onCheckedChange={() => toggleTask(task.id)}
							/>
						</Table.Cell>
						<Table.Cell class="max-w-[300px] min-w-[300px] truncate [&:has([role=checkbox])]:ps-3"
							>{task.title}</Table.Cell
						>
						{#if enableStatus}
							<Table.Cell class="[&:has([role=checkbox])]:ps-3" style="color: {task.status?.color}">
								{task.status?.name}
							</Table.Cell>
						{/if}
						{#if enablePriority}
							<Table.Cell
								class="[&:has([role=checkbox])]:ps-3"
								style="color: {task.priority?.color}"
							>
								{task.priority?.name}
							</Table.Cell>
						{/if}
						<Table.Cell class="[&:has([role=checkbox])]:ps-3">
							{task.dueDate ? formatRelativeDate(task.dueDate) : ''}
						</Table.Cell>
						<Table.Cell class="w-12 [&:has([role=checkbox])]:ps-3">
							{#if task.subtasks && task.subtasks.length > 0}
								<button
									onclick={(e) => toggleExpand(task.id, e)}
									class="rounded p-1 hover:bg-accent"
								>
									<ChevronRight
										class="h-4 w-4 transition-transform duration-200 {expandedTasks[task.id]
											? 'rotate-90'
											: ''}"
									/>
								</button>
							{/if}
						</Table.Cell>
					</Table.Row>

					<!-- Subtasks rows (when expanded) -->
					{#if expandedTasks[task.id] && task.subtasks}
						{#each task.subtasks as subtask}
							<Table.Row
								class="cursor-pointer bg-muted/20"
								onclick={() => (currentTask = { open: true, task: subtask })}
							>
								<Table.Cell
									class="[&:has([role=checkbox])]:ps-3"
									onclick={(e) => e.stopPropagation()}
								>
									<Checkbox
										checked={selectedTasks.includes(subtask.id)}
										onCheckedChange={() => toggleTask(subtask.id)}
									/>
								</Table.Cell>
								<Table.Cell class="[&:has([role=checkbox])]:ps-8">
									<span class="text-muted-foreground">└─</span>
									{subtask.title}
								</Table.Cell>
								{#if enableStatus}
									<Table.Cell
										class="[&:has([role=checkbox])]:ps-3"
										style="color: {subtask.status?.color}"
									>
										{subtask.status?.name}
									</Table.Cell>
								{/if}
								{#if enablePriority}
									<Table.Cell
										class="[&:has([role=checkbox])]:ps-3"
										style="color: {subtask.priority?.color}"
									>
										{subtask.priority?.name}
									</Table.Cell>
								{/if}
								<Table.Cell class="[&:has([role=checkbox])]:ps-3">
									{subtask.dueDate ? formatRelativeDate(subtask.dueDate) : ''}
								</Table.Cell>
								<Table.Cell class="w-12 [&:has([role=checkbox])]:ps-3"></Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-24 text-center">No results.</Table.Cell>
					</Table.Row>
				{/each}
				{#if parentTasks.length > 8}
					<Table.Row>
						<Table.Cell
							colspan={6}
							class="h-12 cursor-pointer text-center"
							onclick={() => (showAllTasks = !showAllTasks)}
						>
							<div class="flex items-center justify-center gap-1">
								{showAllTasks ? 'Show less Tasks' : 'Show more Tasks'}
								<ChevronDown
									class="transition-transform duration-300 {showAllTasks ? 'rotate-180' : ''}"
								/>
							</div>
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Show selection count -->
	{#if selectedTasks.length > 0}
		<div class="py-2 text-sm text-muted-foreground">
			{selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} selected
		</div>
	{/if}
</div>

<TaskSheet
	task={currentTask.task}
	parentTasks={tasks}
	bind:open={currentTask.open}
	{statuses}
	{priorities}
	{users}
/>
