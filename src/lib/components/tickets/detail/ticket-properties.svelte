<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { TagsInput } from '$lib/components/ui/tags-input';
	import { cn } from '$lib/utils';
	import { Check, ChevronDown } from '@lucide/svelte';
	import type { Category, Priority, Status, Tag, User } from '$lib/types';

	let {
		priorityId = $bindable(),
		statusId = $bindable(),
		categoryId = $bindable(),
		userId = $bindable(),
		tags = $bindable(),
		priorities,
		statuses,
		categories,
		users,
		highlightPriority = $bindable(false),
		highlightStatus = $bindable(false),
		highlightCategory = $bindable(false)
	}: {
		priorityId: number;
		statusId: number;
		categoryId: number;
		statuses: Status[];
		priorities: Priority[];
		categories: Category[];
		userId: string | null;
		users: User[];
		tags: Tag[];
		highlightPriority?: boolean;
		highlightStatus?: boolean;
		highlightCategory?: boolean;
	} = $props();
	let open = $state(false);

	let tagNames = $state(tags.map((tag) => tag.name));
	const selectedPriority = $derived(priorities.find((p) => p.id === Number(priorityId)));
	const selectedStatus = $derived(statuses.find((s) => s.id === Number(statusId)));
	const selectedCategory = $derived(categories.find((c) => c.id === Number(categoryId)));

	function handleSelectAssignee(currentAssignedUser: string) {
		userId = currentAssignedUser === userId ? '' : currentAssignedUser;
		open = false;
	}

	let priorityIdString = $state(priorityId.toString());
	let statusIdString = $state(statusId.toString());
	let categoryIdString = $state(categoryId.toString());
	$effect(() => {
		priorityId = Number(priorityIdString);
		statusId = Number(statusIdString);
		categoryId = Number(categoryIdString);
	});
</script>

<Card.Root>
	<Card.Content class="space-y-4">
		<div class=" space-y-2">
			<Label>Primary Assignee</Label>
			<Popover.Root bind:open>
				<Popover.Trigger class="w-full">
					{#snippet child({ props })}
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							class="w-full justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20"
							{...props}
						>
							<span
								class={cn(
									'flex min-w-0 flex-1 items-center gap-2 truncate',
									!userId && 'text-muted-foreground'
								)}
							>
								{#if userId}
									<Avatar.Root class="h-6 w-6">
										<Avatar.Image
											src={users.find((user) => user.id === userId)?.image}
											alt={users.find((user) => user.id === userId)?.name}
										/>
										<Avatar.Fallback>
											{users
												.find((user) => user.id === userId)
												?.name.split(' ')
												.map((n: string) => n[0])
												.join('')
												.toUpperCase()}
										</Avatar.Fallback>
									</Avatar.Root>
									{users.find((user) => user.id === userId)?.name}
								{:else}
									Select user
								{/if}
							</span>
							<ChevronDown size={16} class="shrink-0 text-muted-foreground/80" aria-hidden="true" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-full min-w-(--bits-popover-anchor-width) p-0" align="start">
					<Command.Root>
						<Command.Input placeholder="Search users..." />
						<Command.List>
							<Command.Empty>No framework found.</Command.Empty>
							<Command.Group>
								{#each users as user (user.id)}
									<Command.Item value={user.name} onSelect={() => handleSelectAssignee(user.id)}>
										<Avatar.Root class="h-6 w-6">
											<Avatar.Image src={user.image} alt={user.name} />
											<Avatar.Fallback>
												{user?.name
													.split(' ')
													.map((n: string) => n[0])
													.join('')
													.toUpperCase()}
											</Avatar.Fallback>
										</Avatar.Root>

										{user.name}
										<Check
											class={cn('ml-auto', userId === user.id ? 'opacity-100' : 'opacity-0')}
										/>
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</div>

		<div class="space-y-2">
			<Label>Priority</Label>
			<Select.Root type="single" bind:value={priorityIdString}>
				<Select.Trigger class="w-full {highlightPriority ? 'border-red-600' : ''}">
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

		<div class="space-y-2">
			<Label>Status</Label>
			<Select.Root type="single" bind:value={statusIdString}>
				<Select.Trigger class="w-full {highlightStatus ? 'border-red-600' : ''}">
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

		<div class="space-y-2">
			<Label>Category</Label>
			<Select.Root type="single" bind:value={categoryIdString}>
				<Select.Trigger class="w-full {highlightCategory ? 'border-red-600' : ''}">
					{selectedCategory?.name ?? 'Select a category'}
				</Select.Trigger>
				<Select.Content>
					{#each categories as category (category.id)}
						<Select.Item value={category.id.toString()}>
							{category.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="space-y-2">
			<Label>Tags</Label>
			<TagsInput bind:value={tagNames} placeholder="Add a tag" />
		</div>
	</Card.Content>
</Card.Root>
