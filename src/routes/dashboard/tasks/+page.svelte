<script lang="ts">
	import { invalidate } from '$app/navigation';
	import TaskTable from '$lib/components/tasks/task-table.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import Refresh from '$lib/icons/refresh.svelte';
	import type { TaskPageData } from '$lib/types';
	import { onMount } from 'svelte';

	const { data }: { data: TaskPageData } = $props();

	let autoRefresh = $state(true);

	let tasks = $derived(data.tasks.filter((t) => !t.parentTaskId));
	let finishedTasks = $derived(
		data.finishedTasks.filter((t) => t.subtasks && t.subtasks.length > 0)
	);

	onMount(() => {
		const savedAutoRefresh = localStorage.getItem('autoRefresh');
		if (savedAutoRefresh !== null) {
			autoRefresh = JSON.parse(savedAutoRefresh);
		}
		if (autoRefresh) {
			const interval = setInterval(() => {
				if (autoRefresh) invalidate('app:tasks');
			}, 20000);
			return () => clearInterval(interval);
		}
	});
</script>

<div class="flex items-end justify-between">
	<span class="text-2xl font-extrabold">Tasks</span>
	<div class="flex space-x-3">
		<Button size="sm">New Task</Button>
		<div class="flex items-center">
			<Button
				variant="outline"
				size="sm"
				class="m-0 rounded-r-none border-r-0"
				onclick={() => invalidate('app:tasks')}
			>
				<Refresh class="" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				class="m-0 rounded-l-none {autoRefresh ? 'bg-muted!' : ''}"
				onclick={() => {
					autoRefresh = !autoRefresh;
					localStorage.setItem('autoRefresh', JSON.stringify(autoRefresh));
				}}>Auto Refresh</Button
			>
		</div>
	</div>
</div>

<div class="w-full">
	<div class="grid gap-4 py-4 xl:grid-cols-[60%_40%]">
		<div class="space-y-2">
			<Label class="font-bold">Open Tasks</Label>
			<TaskTable {tasks} priorities={data.priorities} statuses={data.statuses} users={data.users} />
		</div>
		<div class="space-y-2">
			<Label class="font-bold">Completed This Week</Label>
			<TaskTable
				tasks={finishedTasks}
				priorities={data.priorities}
				statuses={data.statuses}
				users={data.users}
				enableStatus={false}
				enablePriority={false}
			/>
		</div>
	</div>
</div>
