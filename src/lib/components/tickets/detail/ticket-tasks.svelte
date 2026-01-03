<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Label } from '$lib/components/ui/label';
	import ClipboardContent from '$lib/icons/clipboard-content.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Priority, Status, Task, User } from '$lib/types';
	import CircleCheck3 from '$lib/icons/circle-check-3.svelte';
	import CircleInfo from '$lib/icons/circle-info.svelte';
	import TaskSheet from '$lib/components/tasks/task-sheet.svelte';
	import Plus from '$lib/icons/plus.svelte';
	import { page } from '$app/state';

	const {
		tasks,
		parentTasks,
		statuses,
		priorities,
		users
	}: {
		tasks: Task[];
		statuses: Status[];
		priorities: Priority[];
		users: User[];
		parentTasks: Task[];
	} = $props();

	let currentTask = $state({
		open: false,
		task: null as Task | null
	});
</script>

<Card.Root>
	<Card.Content class="space-y-4">
		{#if tasks.length !== 0}
			<div class="flex items-center justify-between">
				<h3>Tasks</h3>
				<Button size="sm" onclick={() => (currentTask = { open: true, task: null })}>
					<Plus class="dark:invert-0" />
					Add
				</Button>
			</div>
			{#each tasks as task, i (i)}
				<div
					class="flex items-center justify-between rounded-lg border bg-transparent p-2 dark:bg-input/30 dark:hover:bg-input/50"
				>
					<p class="text-xs">
						{task.title}
					</p>
					<div class="flex gap-1">
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
								>
									<CircleCheck3 />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>Mark Finished</Tooltip.Content>
						</Tooltip.Root>
					</div>
				</div>
			{/each}
		{/if}

		{#if tasks.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<ClipboardContent />
					</Empty.Media>
					<Empty.Title>No Tasks Yet</Empty.Title>
					<Empty.Description>You haven't created any tasks yet.</Empty.Description>
				</Empty.Header>
				<Empty.Content>
					<div class="flex gap-2">
						<Button>Create Task</Button>
					</div>
				</Empty.Content>
			</Empty.Root>
		{/if}
	</Card.Content>
</Card.Root>

<TaskSheet
	bind:task={currentTask.task}
	{parentTasks}
	bind:open={currentTask.open}
	{statuses}
	{priorities}
	{users}
/>
