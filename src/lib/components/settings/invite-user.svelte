<script lang="ts">
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import api from '#lib/utils/axios.js';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import InvitationLink from './invitation-link.svelte';

	let { open = $bindable() }: { open: boolean } = $props();

	let name = $state('');
	let email = $state('');
	let role = $state<'user' | 'admin'>('user');
	let submitting = $state(false);
	/** Set when the email couldn't be sent, so the admin passes the link on */
	let invitationUrl = $state<string>();

	// Starts empty each time the dialog opens
	$effect(() => {
		if (open) {
			name = '';
			email = '';
			role = 'user';
			invitationUrl = undefined;
		}
	});

	async function invite(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		try {
			const { data } = await api.post('/api/settings/users', { name, email, role });
			await invalidate('app:users');
			if (data.emailSent) {
				toast.success(`Invitation sent to ${data.data.email}.`);
				open = false;
			} else {
				invitationUrl = data.invitationUrl;
			}
		} catch {
			// The API client shows the error; the form stays as it was
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Invite user</Dialog.Title>
			<Dialog.Description>
				{invitationUrl
					? `${name} is added to your organization.`
					: 'They get an email with a link to set their password.'}
			</Dialog.Description>
		</Dialog.Header>
		{#if invitationUrl}
			<InvitationLink url={invitationUrl} />
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Done</Dialog.Close>
			</Dialog.Footer>
		{:else}
			<form class="grid gap-4" onsubmit={invite}>
				<div class="grid gap-3">
					<Label for="invite-name">Name</Label>
					<Input id="invite-name" bind:value={name} required maxlength={255} />
				</div>
				<div class="grid gap-3">
					<Label for="invite-email">Email</Label>
					<Input id="invite-email" type="email" bind:value={email} required maxlength={255} />
				</div>
				<div class="grid gap-3">
					<Label>Role</Label>
					<Select.Root type="single" bind:value={role}>
						<Select.Trigger class="w-full capitalize">{role}</Select.Trigger>
						<Select.Content>
							<Select.Item value="user">User</Select.Item>
							<Select.Item value="admin">Admin</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<Dialog.Footer>
					<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
					<Button type="submit" disabled={submitting}>Invite</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
