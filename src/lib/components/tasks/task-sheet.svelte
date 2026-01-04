<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Textarea } from '$lib/components/ui/textarea';
	import { TagsInput } from '$lib/components/ui/tags-input';
	import { Input } from '$lib/components/ui/input';
	import type { Priority, Status, Task, User } from '$lib/types';
	import { formatDate, formatRelativeDate } from '$lib/utils/date';
	import { goto, invalidate } from '$app/navigation';
	import CalendarDays from '$lib/icons/calendar-days.svelte';
	import Ticket from '$lib/icons/ticket.svelte';
	import { toast } from 'svelte-sonner';
	import ClipboardContent from '$lib/icons/clipboard-content.svelte';
	import Tags from '$lib/icons/tags.svelte';
	import Subtitles2 from '$lib/icons/subtitles-2.svelte';
	import CircleCheck3 from '$lib/icons/circle-check-3.svelte';
	import MediaRecord from '$lib/icons/media-record.svelte';
	import api from '$lib/utils/axios';
	import ChevronRight from '$lib/icons/chevron-right.svelte';

	let {
		task = $bindable(),
		parentTasks,
		open = $bindable(false),
		statuses,
		users,
		priorities,
		ticketId
	}: {
		task: Task | null;
		parentTasks: Task[];
		open?: boolean;
		statuses: Status[];
		priorities: Priority[];
		users: User[];
		ticketId?: number;
	} = $props();

	let editableTask = $state<Task>();
	let statusIdString = $state('');
	let priorityIdString = $state('');
	let assigneeIdString = $state('');
	let editDescription = $state<boolean>(false);
	const selectedPriority = $derived(priorities.find((p) => p.id === Number(priorityIdString)));
	const selectedStatus = $derived(statuses.find((p) => p.id === Number(statusIdString)));
	const selectedUser = $derived(
		assigneeIdString === 'none' ? null : users.find((u) => u.id === Number(assigneeIdString))
	);
	const isNewTask = $derived(!task?.id);

	async function removeTag(tagId: number) {
		await api.delete(`/api/tasks/${task?.id}/tags/${tagId}`);
		invalidate('app:tasks');
		invalidate('app:ticket');
	}

	async function addTag(tag: string) {
		await api.post(`/api/tasks/${task?.id}/tags`, { tag });
		invalidate('app:tasks');
		invalidate('app:ticket');
	}

	async function handleSave() {
		if (!editableTask?.title?.trim()) {
			toast.error('Task title is required');
			return;
		}

		if (isNewTask) {
			await api.post('/api/tasks', {
				title: editableTask.title,
				statusId: editableTask.statusId,
				priorityId: editableTask.priorityId,
				description: editableTask.description,
				assigneeId: editableTask.assigneeId,
				ticketId: editableTask.ticketId,
				parentTaskId: editableTask.parentTaskId,
				dueDate: editableTask.dueDate,
				startDate: editableTask.startDate,
				tags: editableTask.tags ? editableTask.tags.map((t) => t.name) : []
			});
			toast.success('Successfully created task.');
		} else {
			await api.patch(`/api/tasks/${editableTask.id}`, { ...editableTask });
			toast.success('Successfully saved task.');
		}
		invalidate('app:tasks');
		invalidate('app:ticket');

		open = false;
	}

	$effect(() => {
		if (open && !editableTask) {
			if (task) {
				editableTask = JSON.parse(JSON.stringify(task));
				statusIdString = editableTask!.statusId.toString();
				priorityIdString = editableTask!.priorityId.toString();
				assigneeIdString = editableTask!.assigneeId?.toString() ?? 'none';
			} else {
				const defaultStatus = statuses[0];
				const defaultPriority = priorities[0];

				editableTask = {
					id: 0,
					title: '',
					description: null,
					ticketId: ticketId ?? null,
					assigneeId: null,
					parentTaskId: null,
					createdById: 0,
					statusId: defaultStatus?.id || 1,
					priorityId: defaultPriority?.id || 1,
					dueDate: new Date(),
					startDate: null,
					completedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					deletedAt: null,
					tags: [],
					creator: undefined,
					ticket: undefined,
					subtasks: undefined,
					status: undefined,
					priority: undefined,
					assignee: undefined,
					parentTask: undefined
				} as Task;

				statusIdString = editableTask!.statusId.toString();
				priorityIdString = editableTask!.priorityId.toString();
				assigneeIdString = 'none';
				editDescription = true;
			}
		}

		if (!open) {
			editableTask = undefined;
			editDescription = false;
		}

		if (editableTask && priorityIdString) {
			editableTask.priorityId = Number(priorityIdString);
		}
		if (editableTask && statusIdString) {
			editableTask.statusId = Number(statusIdString);
		}
		if (editableTask && assigneeIdString) {
			editableTask.assigneeId = assigneeIdString === 'none' ? null : Number(assigneeIdString);
		}
	});
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="w-full overflow-y-auto sm:max-w-150">
		{#if editableTask}
			<Sheet.Description class="flex items-center gap-2 px-4 pt-4">
				{#if isNewTask}
					<Badge>New Task</Badge>
				{:else}
					{#if editableTask.parentTaskId}
						<Badge>Subtask</Badge>
					{/if}
					<p>
						Created {formatRelativeDate(editableTask.createdAt)} by {editableTask.creator?.name ||
							'Unknown'}
					</p>
				{/if}
			</Sheet.Description>

			<div class="space-y-6 py-6">
				<div class="flex gap-4 px-4">
					<div class="flex-1 space-y-1">
						<div class="flex gap-1">
							<ClipboardContent class="" />
							<Label>Title</Label>
						</div>
						<Input bind:value={editableTask.title} placeholder="Please enter a Task title..." />
					</div>
				</div>

				<!-- Status and Priority -->
				<div class="flex gap-4 px-4">
					<div class="flex-1 space-y-1">
						<Label>Status</Label>
						<Select.Root type="single" bind:value={statusIdString}>
							<Select.Trigger class="w-full">
								{selectedStatus?.name ?? 'Select a status'}
							</Select.Trigger>
							<Select.Content>
								{#each statuses as status (status.id)}
									<Select.Item value={status.id.toString()}>
										{status.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex-1 space-y-1">
						<Label>Priority</Label>
						<Select.Root type="single" bind:value={priorityIdString}>
							<Select.Trigger class="w-full">
								{selectedPriority?.name ?? 'Select a priority'}
							</Select.Trigger>
							<Select.Content>
								{#each priorities as priority (priority.id)}
									<Select.Item value={priority.id.toString()}>
										{priority.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="space-y-1 px-4">
					<Label>Assignee</Label>
					<Select.Root type="single" bind:value={assigneeIdString}>
						<Select.Trigger class="w-full">
							{selectedUser?.name ?? 'Unassigned'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="none">Unassigned</Select.Item>
							<Select.Separator />
							{#each users as user (user.id)}
								<Select.Item value={user.id.toString()}>
									{user.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Separator />

				<!-- Description -->
				<div class="space-y-2 px-4">
					<div class="flex items-center justify-between">
						<Label class="mb-3 flex items-center gap-1">
							<Subtitles2 class="h-4 w-4" />
							Description
						</Label>
						{#if !isNewTask}
							<Button size="sm" onclick={() => (editDescription = !editDescription)}>
								{editDescription ? 'Save' : 'Edit'}
							</Button>
						{/if}
					</div>
					{#if editDescription || isNewTask}
						<Textarea
							bind:value={editableTask.description}
							placeholder="Enter task description..."
						/>
					{:else}
						<p class="font-light whitespace-pre-wrap {editableTask.description ? '' : 'text-sm'}">
							{editableTask.description || 'No description'}
						</p>
					{/if}
				</div>

				<Separator />

				<!-- Dates -->
				<div class="grid grid-cols-2 gap-4 px-4">
					<div class="space-y-1">
						<Label class="flex items-center gap-1">
							<CalendarDays class="h-4 w-4" />
							Due Date
						</Label>
						<Input
							type="date"
							value={editableTask.dueDate
								? new Date(editableTask.dueDate).toISOString().split('T')[0]
								: ''}
							onchange={(e) => {
								if (editableTask) {
									editableTask.dueDate = e.currentTarget.value
										? new Date(e.currentTarget.value)
										: new Date();
								}
							}}
						/>
					</div>
					<div class="space-y-1 px-4">
						<Label class="flex items-center gap-1">
							<CalendarDays class="h-4 w-4" />
							Start Date
						</Label>
						<Input
							type="date"
							value={editableTask.startDate
								? new Date(editableTask.startDate).toISOString().split('T')[0]
								: ''}
							onchange={(e) => {
								if (editableTask) {
									editableTask.startDate = e.currentTarget.value
										? new Date(e.currentTarget.value)
										: null;
								}
							}}
						/>
					</div>
				</div>

				<Separator />

				<!-- Tags -->
				<div class="space-y-2 px-4">
					<div class="flex items-center justify-between">
						<Label class="mb-3 flex items-center gap-1">
							<Tags class="h-4 w-4" />
							Tags
						</Label>
					</div>
					{#if isNewTask}
						<TagsInput bind:value={editableTask.tags} />
					{:else}
						<TagsInput bind:value={editableTask.tags} {addTag} {removeTag} />
					{/if}
				</div>
				<Separator />

				<!-- Parent Task Selector -->
				<div class="px-4">
					<Label class="mb-3 flex items-center gap-1">
						<ClipboardContent class="h-4 w-4" />
						Parent Task
					</Label>
					<Select.Root
						type="single"
						value={editableTask.parentTaskId?.toString() || 'none'}
						onValueChange={(v) => {
							if (editableTask) {
								editableTask.parentTaskId = v === 'none' ? null : Number(v);
							}
						}}
					>
						<Select.Trigger class="w-full">
							{editableTask.parentTaskId
								? parentTasks.find((t) => t.id === editableTask!.parentTaskId)?.title ||
									'Select parent task'
								: 'None'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="none">None (Standalone task)</Select.Item>
							<Select.Separator />
							{#each parentTasks.filter( (t) => (!isNewTask ? t.id !== editableTask!.id : true) ) as task (task.id)}
								<Select.Item value={task.id.toString()}>
									{task.title}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<Separator />

				<!-- Linked Ticket -->
				{#if editableTask.ticket && editableTask.ticketId && !isNewTask}
					<div class="px-4">
						<Label class="mb-3 flex items-center gap-1">
							<Ticket class="h-4 w-4" />
							Linked Ticket
						</Label>
						<Button
							variant="outline"
							class="w-full justify-between"
							size="sm"
							onclick={() => goto(`/dashboard/tickets/${editableTask!.ticket!.id}`)}
						>
							<span class="text-sm">
								{editableTask.ticket.ticketNumber}: {editableTask.ticket.subject}
							</span>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
					<Separator />
				{/if}

				<!-- Subtasks -->
				{#if editableTask.subtasks && editableTask.subtasks.length > 0 && !isNewTask}
					<div class="px-4">
						<Label class="mb-3 block text-xs text-muted-foreground">
							Subtasks ({editableTask.subtasks.filter((st) => st.status?.isClosed)
								.length}/{editableTask.subtasks.length})
						</Label>
						<div class="space-y-2">
							{#each editableTask.subtasks as subtask (subtask.id)}
								<div
									class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
								>
									{#if subtask.status && subtask.status.isClosed !== null}
										<Checkbox checked={subtask.status?.isClosed} />
									{/if}
									<div class="min-w-0 flex-1">
										<p
											class="text-sm font-medium {subtask.status?.isClosed
												? 'text-muted-foreground line-through'
												: ''}"
										>
											{subtask.title}
										</p>
										{#if subtask.dueDate}
											<p class="mt-0.5 text-xs text-muted-foreground">
												{#if subtask.status?.isClosed}
													Completed
												{:else}
													Due {formatRelativeDate(subtask.dueDate)}
												{/if}
											</p>
										{/if}
									</div>
									{#if subtask.status?.isClosed}
										<CircleCheck3 />
									{:else}
										<MediaRecord />
									{/if}
								</div>
							{/each}
						</div>
					</div>
					<Separator />
				{/if}

				<!-- Metadata -->
				{#if !isNewTask}
					<div class="space-y-1 px-4 text-xs text-muted-foreground">
						<p>Created: {formatDate(new Date(editableTask.createdAt))}</p>
						<p>Updated: {formatDate(new Date(editableTask.updatedAt))}</p>
						{#if editableTask.completedAt}
							<p>Completed: {formatDate(new Date(editableTask.completedAt))}</p>
						{/if}
					</div>
				{/if}
			</div>

			<Sheet.Footer class="flex flex-row justify-between">
				<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button onclick={handleSave}>
					{isNewTask ? 'Create Task' : 'Save Changes'}
				</Button>
			</Sheet.Footer>
		{/if}
	</Sheet.Content>
</Sheet.Root>
