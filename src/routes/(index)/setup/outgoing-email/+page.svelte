<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SMTP } from '$lib/types';
	import { ToastComponent } from '$lib/components/ui/toast';
	import { Spinner } from '$lib/components/ui/spinner';

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
			const response = await axios.post('/setup/outgoing-email/test', { smtp });

			if (response.data.success) {
				saveDisabled = false;
				testLoading = 'hidden';
				return toast.success(response.data.message);
			}

			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Test failed',
					body: response.data.error || response.data.message
				}
			});
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				testLoading = 'hidden';
				return toast.error(ToastComponent, {
					componentProps: {
						title: error.response.data.message || 'Connection failed',
						body: error.response.data.error || 'Unknown error'
					}
				});
			}

			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Request failed',
					body: error instanceof Error ? error.message : 'Unknown error'
				}
			});
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

		const response = await axios.post('', { smtp });
		if (response.status < 300) {
			toast.success('Succesfully saved SMTP settings.');
			return goto('/setup/incoming-email');
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		let { data } = await axios.get('');
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
