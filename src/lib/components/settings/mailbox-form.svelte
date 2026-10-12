<script lang="ts">
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import api from '#lib/utils/axios.js';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import type { MailboxView } from '#lib/server/mail/mailboxes.js';
	import MailboxServerFields, { type ServerFields } from './mailbox-server-fields.svelte';

	let {
		open = $bindable(),
		mailbox
	}: {
		open: boolean;
		/** The mailbox to edit, or none to add one */
		mailbox: MailboxView | null;
	} = $props();

	const intervals = [
		{ seconds: 60, label: 'Every minute' },
		{ seconds: 120, label: 'Every 2 minutes' },
		{ seconds: 180, label: 'Every 3 minutes' },
		{ seconds: 300, label: 'Every 5 minutes' }
	];

	const emptyServer = (port: number): ServerFields => ({
		host: '',
		port,
		secure: true,
		username: '',
		password: ''
	});

	let name = $state('');
	let address = $state('');
	let imap = $state(emptyServer(993));
	let smtp = $state(emptyServer(465));
	let pollInterval = $state('120');
	let enabled = $state(true);
	let saving = $state(false);
	let testing = $state(false);
	let testResult = $state<{ imap: Result; smtp: Result } | null>(null);

	interface Result {
		ok: boolean;
		message: string;
	}

	// Fills the form each time it opens
	$effect(() => {
		if (!open) return;
		name = mailbox?.name ?? '';
		address = mailbox?.address ?? '';
		imap = mailbox ? { ...mailbox.imap, password: '' } : emptyServer(993);
		smtp = mailbox ? { ...mailbox.smtp, password: '' } : emptyServer(465);
		pollInterval = String(mailbox?.pollIntervalSeconds ?? 120);
		enabled = mailbox?.enabled ?? true;
		testResult = null;
	});

	function input() {
		return {
			name,
			address,
			provider: 'imap',
			imap: { ...imap, port: Number(imap.port) },
			smtp: { ...smtp, port: Number(smtp.port) },
			pollIntervalSeconds: Number(pollInterval),
			enabled
		};
	}

	async function test() {
		testing = true;
		try {
			const { data } = await api.post('/api/settings/mailboxes/test', {
				...input(),
				...(mailbox ? { id: mailbox.id } : {})
			});
			testResult = { imap: data.imap, smtp: data.smtp };
		} catch {
			// The API client shows the error
		} finally {
			testing = false;
		}
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		try {
			if (mailbox) {
				await api.patch(`/api/settings/mailboxes/${mailbox.id}`, input());
				toast.success(`Saved ${address}.`);
			} else {
				await api.post('/api/settings/mailboxes', input());
				toast.success(`Added ${address}. New email to it becomes tickets from now on.`);
			}
			await invalidate('app:mailboxes');
			open = false;
		} catch {
			// The API client shows the error; the form stays as it was
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>{mailbox ? 'Edit mailbox' : 'Add mailbox'}</Dialog.Title>
			<Dialog.Description>
				Email to this address becomes tickets, and replies to those tickets go out from it.
			</Dialog.Description>
		</Dialog.Header>
		<form class="grid gap-6" onsubmit={save}>
			<div class="grid grid-cols-2 gap-3">
				<div class="grid gap-2">
					<Field.Label for="mailbox-name">Name</Field.Label>
					<Input id="mailbox-name" bind:value={name} placeholder="Support" required />
				</div>
				<div class="grid gap-2">
					<Field.Label for="mailbox-address">Email address</Field.Label>
					<Input
						id="mailbox-address"
						type="email"
						bind:value={address}
						placeholder="support@company.com"
						required
					/>
				</div>
			</div>

			<MailboxServerFields
				label="Incoming mail (IMAP)"
				id="imap"
				bind:server={imap}
				hasPassword={mailbox?.imap.hasPassword ?? false}
			/>
			<MailboxServerFields
				label="Outgoing mail (SMTP)"
				id="smtp"
				bind:server={smtp}
				hasPassword={mailbox?.smtp.hasPassword ?? false}
			/>

			<div class="grid grid-cols-2 items-end gap-3">
				<div class="grid gap-2">
					<Field.Label>Check for new email</Field.Label>
					<Select.Root type="single" bind:value={pollInterval}>
						<Select.Trigger class="w-full">
							{intervals.find((interval) => String(interval.seconds) === pollInterval)?.label}
						</Select.Trigger>
						<Select.Content>
							{#each intervals as interval (interval.seconds)}
								<Select.Item value={String(interval.seconds)}>{interval.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex h-9 items-center gap-2">
					<Switch id="mailbox-enabled" bind:checked={enabled} />
					<Field.Label for="mailbox-enabled" class="font-normal">On</Field.Label>
				</div>
			</div>

			{#if testResult}
				<div class="grid gap-1 text-sm" role="status">
					{#each [['IMAP', testResult.imap], ['SMTP', testResult.smtp]] as const as [label, result] (label)}
						<p class={result.ok ? 'text-muted-foreground' : 'text-destructive'}>
							{label}: {result.ok ? 'connected' : result.message}
						</p>
					{/each}
				</div>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={test} disabled={testing}>
					Test connection
				</Button>
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
				<Button type="submit" disabled={saving}>{mailbox ? 'Save' : 'Add mailbox'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
