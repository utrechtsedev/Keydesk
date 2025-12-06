<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { ChevronRight } from '@lucide/svelte';
	import type { Priority, Status, Tag, Task, User } from '$lib/types';
	import { formatRelativeDate } from '$lib/utils/date';
	import TaskSheet from './task-sheet.svelte';
	import ChevronDown from '$lib/icons/chevron-down.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import CircleInfo from '$lib/icons/circle-info.svelte';
	import CircleCheck3 from '$lib/icons/circle-check-3.svelte';
	import TaskFinishDialog from './task-finish-dialog.svelte';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { ToastComponent } from '../ui/toast';

	const {
		tasks,
		users,
		priorities,
		parentTasks,
		statuses
	}: {
		tasks: Task[];
		users: User[];
		statuses: Status[];
		parentTasks: Task[];
		priorities: Priority[];
	} = $props();

	let currentTask = $state({
		open: false,
		task: null as Task | null
	});

	let expandedTasks = $state<Record<number, boolean>>({});

	let openFinishDialog = $state(false);
	let finishDialogTask = $state<Task>();
	let closedStatuses = $state<Status[]>(statuses.filter((s) => s.isClosed));

	async function handleMarkFinished(task: Task) {
		finishDialogTask = task;
		if (closedStatuses && closedStatuses.length > 1) {
			openFinishDialog = true;
			return;
		}
		try {
			const response = await axios.patch('/api/tasks', {
				task: { ...task, statusId: closedStatuses[0].id }
			});

			if (response.status === 200) {
				toast.success(`Succesfully marked task as ${closedStatuses[0].name}`);
				invalidate('app:tasks');
				return;
			}
			return toast.error(ToastComponent, {
				componentProps: {
					title: response.data.message || 'Connection failed',
					body: response.data.error || 'Unknown error'
				}
			});
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return toast.error(ToastComponent, {
					componentProps: {
						title: error.response.data.message || 'Connection failed',
						body: error.response.data.error || 'Unknown error'
					}
				});
			}

			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Request failed',
					body: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}

	let showAllTasks = $state<boolean>(false);
	const displayedTasks = $derived(showAllTasks ? parentTasks : parentTasks.slice(0, 8));
	function toggleExpand(taskId: number, event: MouseEvent) {
		event.stopPropagation();
		expandedTasks[taskId] = !expandedTasks[taskId];
	}
</script>

<div class="w-full overflow-hidden">
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="max-w-[40%] min-w-[40%] font-bold">Title</Table.Head>
					<Table.Head class="max-w-[15%] min-w-[15%] font-bold">Assignee</Table.Head>
					<Table.Head class="max-w-[15%] min-w-[15%] font-bold">Status</Table.Head>
					<Table.Head class="max-w-[15%] min-w-[15%] font-bold">Priority</Table.Head>
					<Table.Head class="max-w-[20%] min-w-[20%] font-bold">Due</Table.Head>
					<Table.Head class="max-w-[20%] min-w-[20%] font-bold">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each displayedTasks as task}
					<Table.Row>
						<Table.Cell class="max-w-[300px] min-w-[300px] truncate">{task.title}</Table.Cell>
						{#if task.assignee}
							<Table.Cell class="max-w-[200px] min-w-[200px] truncate font-light">
								{task.assignee.name}
							</Table.Cell>
						{:else}-{/if}
						<Table.Cell style="--status-color: {task.status?.color};">
							<Badge
								class="rounded-full border-0 px-3 py-0.5 font-medium"
								style="background-color: color-mix(in srgb, var(--status-color) 12%, white);color: color-mix(in srgb, var(--status-color) 85%, black);"
							>
								{task.status?.name}
							</Badge>
						</Table.Cell>
						<Table.Cell style="--priority-color: {task.priority?.color}">
							<Badge
								class="rounded-full border-0 px-3 py-0.5 font-medium"
								style="background-color: color-mix(in srgb, var(--priority-color) 12%, white);color: color-mix(in srgb, var(--priority-color) 85%, black);"
							>
								{task.priority?.name}
							</Badge>
						</Table.Cell>
						<Table.Cell class={task.dueDate && task.dueDate < new Date() ? 'text-red-400' : ''}>
							{task.dueDate ? formatRelativeDate(task.dueDate) : ''}
						</Table.Cell>

						<Table.Cell>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<Button
										size="sm"
										variant="outline"
										class="group transition-all duration-500 hover:bg-blue-600!"
										onclick={() => (currentTask = { open: true, task: task })}
									>
										<CircleInfo />
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>Details</Tooltip.Content>
							</Tooltip.Root>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<Button
										size="sm"
										variant="outline"
										class="group transition-all duration-500 hover:bg-green-600!"
										onclick={() => handleMarkFinished(task)}
									>
										<CircleCheck3 />
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>Mark Finished</Tooltip.Content>
							</Tooltip.Root>
							{#if task.subtasks && task.subtasks.length > 0}
								<Button onclick={(e) => toggleExpand(task.id, e)} variant="outline" size="sm">
									<ChevronRight
										class="h-4 w-4 transition-transform duration-200 {expandedTasks[task.id]
											? 'rotate-90'
											: ''}"
									/>
								</Button>
							{/if}
						</Table.Cell>
					</Table.Row>

					{#if expandedTasks[task.id] && task.subtasks}
						{#each task.subtasks as subtask}
							<Table.Row class="bg-muted/20">
								<Table.Cell>
									<span class="text-muted-foreground">└─</span>
									{subtask.title}
								</Table.Cell>
								{#if subtask.assignee}
									<Table.Cell class="max-w-[200px] min-w-[200px] truncate font-light">
										{subtask.assignee.name}
									</Table.Cell>
								{:else}-{/if}
								<Table.Cell style="--status-color: {subtask.status?.color};">
									<Badge
										class="rounded-full border-0 px-3 py-0.5 font-medium"
										style="background-color: color-mix(in srgb, var(--status-color) 12%, white);color: color-mix(in srgb, var(--status-color) 85%, black);"
									>
										{subtask.status?.name}
									</Badge>
								</Table.Cell>
								<Table.Cell style="--priority-color: {subtask.priority?.color}">
									<Badge
										class="rounded-full border-0 px-3 py-0.5 font-medium"
										style="background-color: color-mix(in srgb, var(--priority-color) 12%, white);color: color-mix(in srgb, var(--priority-color) 85%, black);"
									>
										{subtask.priority?.name}
									</Badge>
								</Table.Cell>
								<Table.Cell
									class={subtask.dueDate && subtask.dueDate < new Date() ? 'text-red-400' : ''}
								>
									{subtask.dueDate ? formatRelativeDate(subtask.dueDate) : ''}
								</Table.Cell>
								<Table.Cell>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<Button
												size="sm"
												variant="outline"
												class="group transition-all duration-500 hover:bg-blue-600!"
												onclick={() => (currentTask = { open: true, task: subtask })}
											>
												<CircleInfo />
											</Button>
										</Tooltip.Trigger>
										<Tooltip.Content>Details</Tooltip.Content>
									</Tooltip.Root>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<Button
												size="sm"
												variant="outline"
												class="group transition-all duration-500 hover:bg-green-600!"
												onclick={() => handleMarkFinished(subtask)}
											>
												<CircleCheck3 />
											</Button>
										</Tooltip.Trigger>
										<Tooltip.Content>Mark Finished</Tooltip.Content>
									</Tooltip.Root>
								</Table.Cell>
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
</div>

<TaskSheet
	bind:task={currentTask.task}
	{parentTasks}
	bind:open={currentTask.open}
	{statuses}
	{priorities}
	{users}
/>
<TaskFinishDialog bind:open={openFinishDialog} statuses={closedStatuses} task={finishDialogTask} />
