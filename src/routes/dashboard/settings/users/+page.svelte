<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import type { PageData, User } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { authClient } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { goto, invalidate } from '$app/navigation';
	import { ConfirmDialog, confirmDialog } from '$lib/components/ui/confirm-dialog';
	import Dots from '$lib/icons/dots.svelte';

	let { data }: { data: PageData & { users: User[] } } = $props();

	let searchTerm = $state('');
	let currentPage = $state(0);
	const pageSize = 10;

	let filteredUsers = $derived(
		data.users.filter(
			(user) =>
				user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				user.email.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	let paginatedUsers = $derived(
		filteredUsers.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
	);

	let totalPages = $derived(Math.ceil(filteredUsers.length / pageSize));

	$effect(() => {
		if (searchTerm) {
			currentPage = 0;
		}
	});

	function nextPage() {
		if (currentPage < totalPages - 1) {
			currentPage++;
		}
	}

	function previousPage() {
		if (currentPage > 0) {
			currentPage--;
		}
	}

	async function impersonateUser(userId: number) {
		const { error } = await authClient.admin.impersonateUser({
			userId
		});
		if (error?.message) toast.error(error.message);
		window.location.href = '/dashboard';
	}

	async function disableUser(userId: number) {
		const { data, error } = await authClient.admin.banUser({
			userId
		});
		if (error?.message) toast.error(error.message);
		if (data) toast.success(`Succesfully disabled ${data.user.name}`);
		invalidate('app:users');
	}

	async function enableUser(userId: number) {
		const { data, error } = await authClient.admin.unbanUser({
			userId
		});
		if (error?.message) toast.error(error.message);
		if (data) toast.success(`Succesfully enabled ${data.user.name}`);
		invalidate('app:users');
	}
</script>

<div class="w-full">
	<div class="flex items-center px-4 pb-4">
		<Input placeholder="Search by name or email..." bind:value={searchTerm} class="max-w-sm" />
	</div>

	<div class="border-y">
		<Table.Root>
			<Table.Header>
				<Table.Row class="font-bold">
					<Table.Head class="w-[30%]">Name</Table.Head>
					<Table.Head class="w-[30%]">Email</Table.Head>
					<Table.Head class="w-[10%]">Verified</Table.Head>
					<Table.Head class="w-[15%]">Role</Table.Head>
					<Table.Head class="w-[10%]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each paginatedUsers as user (user.id)}
					<Table.Row>
						<Table.Cell class="gap-3">
							{user.name}
							{#if user.banned}
								<Badge>Disabled</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>{user.email}</Table.Cell>
						<Table.Cell>{user.emailVerified ? 'Yes' : 'No'}</Table.Cell>
						<Table.Cell class="capitalize">{user.role}</Table.Cell>
						<Table.Cell>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
											<span class="sr-only">Open menu</span>
											<Dots />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Group>
										<DropdownMenu.Label>Actions</DropdownMenu.Label>
										<DropdownMenu.Item onclick={() => goto(`/dashboard/settings/users/${user.id}`)}>
											Edit User
										</DropdownMenu.Item>
									</DropdownMenu.Group>
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={() => impersonateUser(user.id)}>
										Impersonate
									</DropdownMenu.Item>

									{#if !user.banned}
										<DropdownMenu.Item onclick={() => disableUser(user.id)}>
											Disable User
										</DropdownMenu.Item>
									{:else}
										<DropdownMenu.Item onclick={() => enableUser(user.id)}>
											Enable User
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Item
										onclick={() => {
											confirmDialog({
												title: 'Delete User',
												description: 'Are you sure you want to delete this user?',
												onConfirm: async () => {
													const { data, error } = await authClient.admin.removeUser({
														userId: user.id
													});
													if (error?.message) toast.error(error.message);
													if (data) toast.success(`Succesfully deleted ${user.name}`);
													invalidate('app:users');
												}
											});
										}}
									>
										Delete User
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={5} class="h-24 text-center">No results.</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="flex items-center justify-between px-4 pt-4">
		<div class="text-sm text-muted-foreground">
			Showing {paginatedUsers.length} of {filteredUsers.length} user(s)
		</div>
		<div class="flex items-center gap-2">
			<div class="text-sm text-muted-foreground">
				Page {currentPage + 1} of {totalPages || 1}
			</div>
			<div class="space-x-2">
				<Button variant="outline" size="sm" onclick={previousPage} disabled={currentPage === 0}>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={nextPage}
					disabled={currentPage >= totalPages - 1}
				>
					Next
				</Button>
			</div>
		</div>
	</div>
</div>

<ConfirmDialog />
