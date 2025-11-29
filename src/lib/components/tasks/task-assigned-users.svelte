<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDown, Check } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import type { User } from '$lib/types';

	let {
		users,
		userIds = $bindable([])
	}: {
		users: User[];
		userIds?: string[];
	} = $props();

	let open = $state(false);

	function handleToggleAssignee(userId: string) {
		if (userIds.includes(userId)) {
			userIds = userIds.filter((id) => id !== userId);
		} else {
			userIds = [...userIds, userId];
		}
	}

	const selectedUsers = $derived(users.filter((user) => userIds.includes(user.id)));
</script>

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
						userIds.length === 0 && 'text-muted-foreground'
					)}
				>
					{#if userIds.length === 0}
						Select users
					{:else if userIds.length === 1}
						<Avatar.Root class="h-6 w-6">
							<Avatar.Image src={selectedUsers[0].image} alt={selectedUsers[0].name} />
							<Avatar.Fallback>
								{selectedUsers[0].name
									.split(' ')
									.map((n) => n[0])
									.join('')
									.toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>
						{selectedUsers[0].name}
					{:else if userIds.length === 2}
						<div class="flex -space-x-2">
							{#each selectedUsers as user}
								<Avatar.Root class="h-6 w-6 border-2 border-background">
									<Avatar.Image src={user.image} alt={user.name} />
									<Avatar.Fallback>
										{user.name
											.split(' ')
											.map((n) => n[0])
											.join('')
											.toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
							{/each}
						</div>
						<span class="truncate">{selectedUsers.map((u) => u.name).join(', ')}</span>
					{:else}
						<div class="flex -space-x-2">
							{#each selectedUsers.slice(0, 2) as user}
								<Avatar.Root class="h-6 w-6 border-2 border-background">
									<Avatar.Image src={user.image} alt={user.name} />
									<Avatar.Fallback>
										{user.name
											.split(' ')
											.map((n) => n[0])
											.join('')
											.toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
							{/each}
						</div>
						<span>{userIds.length} users selected</span>
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
				<Command.Empty>No users found.</Command.Empty>
				<Command.Group>
					{#each users as user (user.id)}
						<Command.Item value={user.name} onSelect={() => handleToggleAssignee(user.id)}>
							<Avatar.Root class="h-6 w-6">
								<Avatar.Image src={user.image} alt={user.name} />
								<Avatar.Fallback>
									{user.name
										.split(' ')
										.map((n) => n[0])
										.join('')
										.toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							{user.name}
							<Check
								class={cn('ml-auto', userIds.includes(user.id) ? 'opacity-100' : 'opacity-0')}
							/>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
