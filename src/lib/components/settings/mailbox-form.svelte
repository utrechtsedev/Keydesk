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

	type Provider = MailboxView['provider'];

	let {
		open = $bindable(),
		mailbox,
		microsoftAvailable
	}: {
		open: boolean;
		/** The mailbox to edit, or none to add one */
		mailbox: MailboxView | null;
		/** Whether this Keydesk can connect Microsoft 365 mailboxes */
		microsoftAvailable: boolean;
	} = $props();

	const intervals = [
		{ seconds: 60, label: 'Every minute' },
		{ seconds: 120, label: 'Every 2 minutes' },
		{ seconds: 180, label: 'Every 3 minutes' },
		{ seconds: 300, label: 'Every 5 minutes' }
	];

	const providers: { value: Provider; label: string }[] = [
		{ value: 'imap', label: 'IMAP and SMTP' },
		{ value: 'microsoft', label: 'Microsoft 365' }
	];

	const emptyServer = (port: number): ServerFields => ({
		host: '',
		port,
		secure: true,
		username: '',
		password: ''
	});

	let provider = $state<Provider>('imap');
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
		provider = mailbox?.provider ?? 'imap';
		name = mailbox?.name ?? '';
		address = mailbox?.address ?? '';
		imap = mailbox?.provider === 'imap' ? { ...mailbox.imap, password: '' } : emptyServer(993);
		smtp = mailbox?.provider === 'imap' ? { ...mailbox.smtp, password: '' } : emptyServer(465);
		pollInterval = String(mailbox?.pollIntervalSeconds ?? 120);
		enabled = mailbox?.enabled ?? true;
		testResult = null;
	});

	function imapInput() {
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

	/** Microsoft takes over from here: the admin signs in there and grants access */
	function connectMicrosoft() {
		const params = new URLSearchParams({
			name,
			address,
			pollIntervalSeconds: pollInterval,
			...(mailbox ? { mailboxId: String(mailbox.id) } : {})
		});
		window.location.href = `/dashboard/settings/mailboxes/microsoft?${params}`;
	}

	async function test() {
		testing = true;
		try {
			const { data } = await api.post('/api/settings/mailboxes/test', {
				...imapInput(),
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
		if (provider === 'microsoft' && !mailbox) {
			connectMicrosoft();
			return;
		}

		saving = true;
		try {
			if (!mailbox) {
				await api.post('/api/settings/mailboxes', imapInput());
				toast.success(`Added ${address}. New email to it becomes tickets from now on.`);
			} else if (mailbox.provider === 'imap') {
				await api.patch(`/api/settings/mailboxes/${mailbox.id}`, imapInput());
				toast.success(`Saved ${address}.`);
			} else {
				await api.patch(`/api/settings/mailboxes/${mailbox.id}`, {
					name,
					pollIntervalSeconds: Number(pollInterval),
					enabled
				});
				toast.success(`Saved ${mailbox.address}.`);
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
			{#if !mailbox && microsoftAvailable}
				<div class="grid gap-2">
					<Field.Label>Provider</Field.Label>
					<Select.Root type="single" bind:value={provider}>
						<Select.Trigger class="w-full">
							{providers.find((option) => option.value === provider)?.label}
						</Select.Trigger>
						<Select.Content>
							{#each providers as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

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
						readonly={mailbox !== null && provider !== 'imap'}
						required
					/>
				</div>
			</div>

			{#if provider === 'imap'}
				<MailboxServerFields
					label="Incoming mail (IMAP)"
					id="imap"
					bind:server={imap}
					hasPassword={mailbox?.provider === 'imap' && mailbox.imap.hasPassword}
				/>
				<MailboxServerFields
					label="Outgoing mail (SMTP)"
					id="smtp"
					bind:server={smtp}
					hasPassword={mailbox?.provider === 'imap' && mailbox.smtp.hasPassword}
				/>
			{:else if !mailbox}
				<p class="text-sm text-muted-foreground">
					You sign in with Microsoft next, as an admin of the Microsoft 365 organization the address
					belongs to, and allow Keydesk to read and send its email.
				</p>
			{/if}

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
				{#if mailbox || provider === 'imap'}
					<div class="flex h-9 items-center gap-2">
						<Switch id="mailbox-enabled" bind:checked={enabled} />
						<Field.Label for="mailbox-enabled" class="font-normal">On</Field.Label>
					</div>
				{/if}
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
				{#if provider === 'imap'}
					<Button type="button" variant="outline" onclick={test} disabled={testing}>
						Test connection
					</Button>
				{:else if mailbox && microsoftAvailable}
					<Button type="button" variant="outline" onclick={connectMicrosoft}>Connect again</Button>
				{/if}
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
				<Button type="submit" disabled={saving}>
					{#if mailbox}
						Save
					{:else if provider === 'microsoft'}
						Connect with Microsoft
					{:else}
						Add mailbox
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
