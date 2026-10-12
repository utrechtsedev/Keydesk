<script lang="ts">
	import * as Table from '#lib/components/ui/table/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import type { PageProps } from './$types';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { authClient } from '#lib/auth-client.js';
	import api from '#lib/utils/axios.js';
	import { toast } from 'svelte-sonner';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { goto, invalidate } from '$app/navigation';
	import { ConfirmDialog, confirmDialog } from '#lib/components/ui/confirm-dialog/index.js';
	import InviteUser from '#lib/components/settings/invite-user.svelte';
	import InvitationLink from '#lib/components/settings/invitation-link.svelte';
	import Dots from '#lib/icons/dots.svelte';
	import Plus from '#lib/icons/plus.svelte';

	let { data }: PageProps = $props();

	type ListedUser = (typeof data.users)[number];

	let searchTerm = $state('');
	let currentPage = $state(0);
	const pageSize = 10;
	let inviteOpen = $state(false);
	/** A renewed invitation link the admin passes on, because the email couldn't be sent */
	let renewedInvitationUrl = $state<string>();

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
		if (error) {
			toast.error(error.message ?? 'Could not impersonate this user.');
			return;
		}
		window.location.href = '/dashboard';
	}

	async function setDisabled(user: ListedUser, banned: boolean) {
		await api.patch(`/api/settings/users/${user.id}`, { banned });
		toast.success(`${banned ? 'Disabled' : 'Enabled'} ${user.name}.`);
		await invalidate('app:users');
	}

	async function resendInvitation(user: ListedUser) {
		const { data: result } = await api.post(`/api/settings/users/${user.id}/invitation`);
		await invalidate('app:users');
		if (result.emailSent) {
			toast.success(`Sent a new invitation to ${user.email}.`);
		} else {
			renewedInvitationUrl = result.invitationUrl;
		}
	}

	function deleteUser(user: ListedUser) {
		confirmDialog({
			title: 'Delete User',
			description: `Delete ${user.name}? Their tickets and tasks stay, without an assignee.`,
			onConfirm: async () => {
				await api.delete(`/api/settings/users/${user.id}`);
				toast.success(`Deleted ${user.name}.`);
				await invalidate('app:users');
			}
		});
	}
</script>

<div class="w-full">
	<div class="flex items-center justify-between gap-2 px-4 pb-4">
		<Input placeholder="Search by name or email..." bind:value={searchTerm} class="max-w-sm" />
		<Button onclick={() => (inviteOpen = true)} variant="secondary">
			<Plus />
			Invite User
		</Button>
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
							{#if user.invitationExpiresAt}
								<Badge variant="outline">
									{new Date(user.invitationExpiresAt) < new Date()
										? 'Invitation expired'
										: 'Invited'}
								</Badge>
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
									{#if user.invitationExpiresAt}
										<DropdownMenu.Item onclick={() => resendInvitation(user)}>
											Resend Invitation
										</DropdownMenu.Item>
									{/if}
									{#if user.id !== data.user.id}
										<DropdownMenu.Separator />
										{#if user.role !== 'admin'}
											<DropdownMenu.Item onclick={() => impersonateUser(user.id)}>
												Impersonate
											</DropdownMenu.Item>
										{/if}
										<DropdownMenu.Item onclick={() => setDisabled(user, !user.banned)}>
											{user.banned ? 'Enable User' : 'Disable User'}
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => deleteUser(user)}>
											Delete User
										</DropdownMenu.Item>
									{/if}
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
<InviteUser bind:open={inviteOpen} />

<Dialog.Root
	open={renewedInvitationUrl !== undefined}
	onOpenChange={(open) => {
		if (!open) renewedInvitationUrl = undefined;
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>New invitation link</Dialog.Title>
		</Dialog.Header>
		{#if renewedInvitationUrl}
			<InvitationLink url={renewedInvitationUrl} />
		{/if}
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Done</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
