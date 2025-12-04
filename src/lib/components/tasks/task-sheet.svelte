<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Rename from '$lib/components/ui/rename';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Textarea } from '../ui/textarea';
	import { TagsInput } from '../ui/tags-input';
	import { Input } from '../ui/input';
	import { ToastComponent } from '$lib/components/ui/toast';
	import { ChevronRight } from '@lucide/svelte';
	import type { Priority, Status, Task, User } from '$lib/types';
	import { formatDate, formatRelativeDate } from '$lib/utils/date';
	import { goto, invalidate } from '$app/navigation';
	import CalendarDays from '$lib/icons/calendar-days.svelte';
	import Ticket from '$lib/icons/ticket.svelte';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import ClipboardContent from '$lib/icons/clipboard-content.svelte';
	import Tags from '$lib/icons/tags.svelte';
	import Subtitles2 from '$lib/icons/subtitles-2.svelte';
	import CircleCheck3 from '$lib/icons/circle-check-3.svelte';
	import MediaRecord from '$lib/icons/media-record.svelte';

	let {
		task = $bindable(),
		parentTasks,
		open = $bindable(false),
		statuses,
		users,
		priorities
	}: {
		task: Task | null;
		parentTasks: Task[];
		open?: boolean;
		statuses: Status[];
		priorities: Priority[];
		users: User[];
	} = $props();

	let editableTask = $state<Task>();
	let statusIdString = $state('');
	let priorityIdString = $state('');
	let assigneeIdString = $state('');
	let editDescription = $state<boolean>(false);
	let editTags = $state<boolean>(false);
	let editableTags = $derived<string[] | undefined>(editableTask?.tags?.map((t) => t.name));
	const selectedStatus = $derived(statuses.find((s) => s.id === Number(statusIdString)));
	const selectedPriority = $derived(priorities.find((p) => p.id === Number(priorityIdString)));
	const selectedUser = $derived(users.find((u) => u.id === assigneeIdString));

	async function handleSaveTags() {
		try {
			const response = await axios.post('/api/tags/bulk', {
				id: task?.id,
				type: 'task',
				tags: editableTags || []
			});
			if (response.data.success) {
				editTags = false;
				invalidate('app:tasks');
				editableTask!.tags = response.data.tags;
			}

			toast.success('Succesfully saved tags.');
		} catch (err) {
			if (axios.isAxiosError(err) && err.response) {
				toast.error(ToastComponent, {
					componentProps: {
						title: 'Failed saving Tags',
						body: err.message
					}
				});
			}
		}
	}

	async function handleSave() {
		try {
			const response = await axios.patch('/api/tasks', { task: editableTask });

			if (response.data.success) {
				invalidate('app:tasks');
				open = false;
			}

			toast.success('Succesfully saved task.');
		} catch (err) {
			if (axios.isAxiosError(err) && err.response) {
				toast.error(ToastComponent, {
					componentProps: {
						title: 'Failed saving Task',
						body: err.message
					}
				});
			}
		}
	}

	$effect(() => {
		if (task && open && !editableTask) {
			editableTask = JSON.parse(JSON.stringify(task));
			statusIdString = editableTask!.statusId.toString();
			priorityIdString = editableTask!.priorityId.toString();
			assigneeIdString = editableTask!.assigneeId;
		}
		if (!open) {
			editableTask = undefined;
			editDescription = false;
			editTags = false;
		}
		if (editableTask && priorityIdString) {
			editableTask.priorityId = Number(priorityIdString);
		}
		// Sync changes back to editableTask
		if (editableTask && statusIdString) {
			editableTask.statusId = Number(statusIdString);
		}
		if (editableTask && assigneeIdString) {
			editableTask.assigneeId = assigneeIdString; // Add this
		}
	});
</script>

<Sheet.Root
	bind:open
	onOpenChangeComplete={(v) => {
		if (v === false) {
			goto('/dashboard/tasks');
		}
	}}
>
	<Sheet.Content class="w-full overflow-y-auto sm:max-w-[600px]">
		{#if editableTask}
			<Sheet.Header>
				<div class="flex items-center gap-1">
					<ClipboardContent class="h-6 w-6" />
					<Rename.Root
						this="span"
						class="w-10/12 rounded-lg p-1 text-2xl font-semibold hover:bg-muted"
						validate={(value) => value.length > 0}
						bind:value={editableTask.title}
					/>
				</div>
				<Sheet.Description class="flex items-center gap-2">
					{#if editableTask.parentTaskId}
						<Badge>Subtask</Badge>
					{/if}
					<p>
						Created {formatRelativeDate(editableTask.createdAt)} by {editableTask.creator?.name ||
							'Unknown'}
					</p>
				</Sheet.Description>
			</Sheet.Header>

			<div class="space-y-6 py-6">
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
							{selectedUser?.name ?? 'Select a user'}
						</Select.Trigger>
						<Select.Content>
							{#each users as user (user.id)}
								<Select.Item value={user.id}>
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
						<Button size="sm" onclick={() => (editDescription = !editDescription)}>
							{editDescription ? 'Save' : 'Edit'}
						</Button>
					</div>
					{#if editDescription}
						<Textarea bind:value={editableTask.description} />
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
										: null;
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
						{#if editTags}
							<Button size="sm" onclick={handleSaveTags}>Save</Button>
						{:else}
							<Button size="sm" onclick={() => (editTags = true)}>Edit</Button>
						{/if}
					</div>
					{#if editTags}
						<TagsInput bind:value={editableTags} />
					{:else if editableTask.tags && editableTask.tags.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each editableTask.tags as tag}
								<Badge variant="outline">{tag.name}</Badge>
							{/each}
						</div>
					{:else}
						<p class="text-sm font-light">No tags</p>
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
							<Select.Item value="">None (Standalone task)</Select.Item>
							<Select.Separator />
							{#each parentTasks.filter((t) => t.id !== editableTask!.id) as task}
								<Select.Item value={task.id.toString()}>
									{task.title}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<Separator />

				<!-- Linked Ticket -->
				{#if editableTask.ticket && editableTask.ticketId}
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
				{#if editableTask.subtasks && editableTask.subtasks.length > 0}
					<div class="px-4">
						<Label class="mb-3 block text-xs text-muted-foreground">
							Subtasks ({editableTask.subtasks.filter((st) => st.status?.isClosed)
								.length}/{editableTask.subtasks.length})
						</Label>
						<div class="space-y-2">
							{#each editableTask.subtasks as subtask}
								<div
									class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
								>
									<Checkbox checked={subtask.status?.isClosed} />
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
				<div class="space-y-1 px-4 text-xs text-muted-foreground">
					<p>Created: {formatDate(new Date(editableTask.createdAt))}</p>
					<p>Updated: {formatDate(new Date(editableTask.updatedAt))}</p>
					{#if editableTask.completedAt}
						<p>Completed: {formatDate(new Date(editableTask.completedAt))}</p>
					{/if}
				</div>
			</div>

			<Sheet.Footer class="flex flex-row justify-between">
				<Button variant="outline" onclick={() => (open = false)}>Close</Button>
				<Button onclick={handleSave}>Save Changes</Button>
			</Sheet.Footer>
		{/if}
	</Sheet.Content>
</Sheet.Root>
