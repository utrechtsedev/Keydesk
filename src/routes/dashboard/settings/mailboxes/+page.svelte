<script lang="ts">
	import * as Table from '#lib/components/ui/table/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { ConfirmDialog, confirmDialog } from '#lib/components/ui/confirm-dialog/index.js';
	import MailboxForm from '#lib/components/settings/mailbox-form.svelte';
	import api from '#lib/utils/axios.js';
	import { toast } from 'svelte-sonner';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Dots from '#lib/icons/dots.svelte';
	import Plus from '#lib/icons/plus.svelte';
	import type { MailboxView } from '#lib/server/mail/mailboxes.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const providerNames = { imap: 'IMAP', microsoft: 'Microsoft 365' };

	// Coming back from connecting a mailbox at a provider
	$effect(() => {
		const error = page.url.searchParams.get('error');
		const connected = page.url.searchParams.get('connected');
		if (!error && !connected) return;
		if (error) toast.error(error);
		if (connected)
			toast.success(`Connected ${connected}. New email to it becomes tickets from now on.`);
		goto(page.url.pathname, { replaceState: true });
	});

	let formOpen = $state(false);
	let editing = $state<MailboxView | null>(null);

	function add() {
		editing = null;
		formOpen = true;
	}

	function edit(mailbox: MailboxView) {
		editing = mailbox;
		formOpen = true;
	}

	async function syncNow(mailbox: MailboxView) {
		await api.post(`/api/settings/mailboxes/${mailbox.id}/sync`);
		toast.success(`Checking ${mailbox.address} for new email.`);
	}

	function remove(mailbox: MailboxView) {
		confirmDialog({
			title: 'Delete mailbox',
			description: `Stop reading ${mailbox.address}? Its tickets stay; replies to them go out from another mailbox.`,
			onConfirm: async () => {
				await api.delete(`/api/settings/mailboxes/${mailbox.id}`);
				toast.success(`Deleted ${mailbox.address}.`);
				await invalidate('app:mailboxes');
			}
		});
	}

	const time = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

	function ago(date: Date): string {
		const minutes = Math.round((new Date(date).getTime() - Date.now()) / 60_000);
		return Math.abs(minutes) < 60
			? time.format(minutes, 'minute')
			: time.format(Math.round(minutes / 60), 'hour');
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Mailboxes</h1>
			<p class="text-sm text-muted-foreground">
				Email to these addresses becomes tickets; replies go out from the ticket's mailbox.
			</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={add} variant="secondary">
				<Plus />
				Add Mailbox
			</Button>
		</div>
	</div>

	<div class="border-y">
		<Table.Root>
			<Table.Header>
				<Table.Row class="font-bold">
					<Table.Head class="w-[20%]">Name</Table.Head>
					<Table.Head class="w-[30%]">Address</Table.Head>
					<Table.Head class="w-[10%]">Provider</Table.Head>
					<Table.Head class="w-[30%]">Status</Table.Head>
					<Table.Head class="w-[10%]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.mailboxes as mailbox (mailbox.id)}
					<Table.Row>
						<Table.Cell>{mailbox.name}</Table.Cell>
						<Table.Cell>{mailbox.address}</Table.Cell>
						<Table.Cell>{providerNames[mailbox.provider]}</Table.Cell>
						<Table.Cell class="whitespace-normal">
							{#if !mailbox.enabled}
								<Badge variant="outline">Off</Badge>
							{:else if mailbox.lastError}
								<Badge variant="destructive">Can't connect</Badge>
								<span class="text-sm text-muted-foreground">{mailbox.lastError}</span>
							{:else if mailbox.lastSyncedAt}
								<span class="text-sm text-muted-foreground">
									Checked {ago(mailbox.lastSyncedAt)}
								</span>
							{:else}
								<span class="text-sm text-muted-foreground">Connecting…</span>
							{/if}
						</Table.Cell>
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
									<DropdownMenu.Item onclick={() => edit(mailbox)}>Edit</DropdownMenu.Item>
									{#if mailbox.enabled}
										<DropdownMenu.Item onclick={() => syncNow(mailbox)}>Check now</DropdownMenu.Item
										>
									{/if}
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={() => remove(mailbox)}>Delete</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
							No mailboxes yet. Add one to turn email into tickets.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<MailboxForm bind:open={formOpen} mailbox={editing} microsoftAvailable={data.microsoftAvailable} />
<ConfirmDialog />
