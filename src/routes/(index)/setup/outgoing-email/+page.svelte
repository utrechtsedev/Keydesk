<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SMTP } from '$lib/types';
	import { Spinner } from '$lib/components/ui/spinner';
	import api from '$lib/utils/axios';

	let smtp: SMTP = $state({
		senderName: '',
		senderEmail: '',
		host: '',
		port: 587,
		SSL: true,
		enableAuthentication: true,
		username: '',
		password: ''
	});
	let saveDisabled = $state(true);
	let testLoading = $state('hidden');

	async function testConfiguration() {
		testLoading = '';
		try {
			const response = await api.post('/setup/outgoing-email/test', { smtp });
			saveDisabled = false;
			return toast.success(response.data.message);
		} finally {
			testLoading = 'hidden';
		}
	}

	async function handleNext() {
		if (!smtp.senderName || !smtp.senderEmail || !smtp.host || !smtp.port) {
			return toast.error('Please enter SMTP sender name, email, host and port.');
		}

		if (smtp.enableAuthentication && (!smtp.username || !smtp.password)) {
			return toast.error(
				'Please enter an SMTP username and password or disable SMTP authentication.'
			);
		}

		await api.post('', { smtp });
		toast.success('Succesfully saved SMTP settings.');
		return goto('/setup/incoming-email');
	}

	onMount(async () => {
		let { data } = await api.get('');
		if (data.data) smtp = data.data;
	});

	$effect(() => {
		if (!smtp.enableAuthentication) {
			smtp.username = '';
			smtp.password = '';
		}
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Email Configuration</h1>
			<p class="text-sm text-muted-foreground">Set your SMTP configuration</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={testConfiguration}>
				Test
				<Spinner class={testLoading} />
			</Button>
			<Button disabled={saveDisabled} onclick={handleNext}>Save</Button>
		</div>
	</div>

	<div class="grid">
		<div class="flex justify-between border-y px-4 py-3">
			<Label for="smtp-name" class="text-md">SMTP Sender Name</Label>
			<Input
				id="smtp-name"
				type="text"
				placeholder="Acme Inc."
				required
				bind:value={smtp.senderName}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="smtp-sender" class="text-md">SMTP Sender Email</Label>
			<Input
				id="smtp-sender"
				type="email"
				placeholder="user@example.com"
				required
				bind:value={smtp.senderEmail}
				class="w-[40%]"
			/>
		</div>

		<div class="flex justify-between border-b px-4 py-3">
			<Label for="smtp-host" class="text-md">SMTP Host</Label>
			<Input
				id="smtp-host"
				type="text"
				placeholder="localhost"
				required
				bind:value={smtp.host}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="smtp-port" class="text-md">SMTP Port</Label>
			<Input
				id="smtp-port"
				type="number"
				placeholder="587"
				required
				class="w-[15%]"
				bind:value={smtp.port}
			/>
		</div>

		<div class="flex justify-between border-b px-4 py-3">
			<Label for="smtp-ssl" class="text-md">Enable SSL</Label>
			<Switch id="smtp-ssl" bind:checked={smtp.SSL} />
		</div>

		<div class="flex justify-between {smtp.enableAuthentication ? 'border-b' : ''} px-4 py-3">
			<Label for="smtp-authentication" class="text-md">Enable Authentication</Label>
			<Switch id="smtp-authentication" bind:checked={smtp.enableAuthentication} />
		</div>

		{#if smtp.enableAuthentication}
			<div class="flex justify-between border-b px-4 py-3">
				<Label for="smtp-username" class="text-md">SMTP Username</Label>
				<Input
					id="smtp-username"
					type="text"
					placeholder="user@example.com"
					required
					bind:value={smtp.username}
					class="w-[40%]"
				/>
			</div>
			<div class="flex justify-between border-b px-4 py-3">
				<Label for="smtp-password" class="text-md">SMTP Password</Label>
				<Input
					id="smtp-password"
					type="password"
					placeholder="*********"
					required
					bind:value={smtp.password}
					class="w-[40%]"
				/>
			</div>
		{/if}
	</div>
</div>
