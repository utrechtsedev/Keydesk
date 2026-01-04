<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { IMAP } from '$lib/types';
	import { Spinner } from '$lib/components/ui/spinner';
	import api from '$lib/utils/axios';

	let imap: IMAP = $state({
		host: '',
		port: 993,
		username: '',
		password: '',
		SSL: true
	});

	let saveDisabled = $state(true);
	let testLoading = $state('hidden');

	async function testConfiguration() {
		testLoading = '';
		try {
			const response = await api.post('/setup/incoming-email/test', { ...imap });
			if (response.data.success) {
				saveDisabled = false;
				toast.success(response.data.message);
			}
		} finally {
			testLoading = 'hidden';
		}
	}
	async function handleNext() {
		if (!imap.host || !imap.port || !imap.username || !imap.password) {
			return toast.error('Please enter IMAP details.');
		}

		await api.post('', { ...imap });

		toast.success('Succesfully saved IMAP settings.');
		return goto('/setup/portal');
	}

	onMount(async () => {
		let { data } = await api.get('');
		if (data.data) imap = data.data;
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Email Configuration</h1>
			<p class="text-sm text-muted-foreground">Set your IMAP configuration</p>
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
			<Label for="IMAP-host" class="text-md">IMAP Host</Label>
			<Input
				id="imap-host"
				type="text"
				placeholder="localhost"
				required
				bind:value={imap.host}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="imap-port" class="text-md">IMAP Port</Label>
			<Input
				id="imap-port"
				type="number"
				placeholder="993"
				required
				class="w-[15%]"
				bind:value={imap.port}
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="imap-username" class="text-md">IMAP Username</Label>
			<Input
				id="imap-username"
				type="text"
				placeholder="user@example.com"
				required
				bind:value={imap.username}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="imap-password" class="text-md">IMAP Password</Label>
			<Input
				id="imap-password"
				type="password"
				placeholder="*********"
				required
				bind:value={imap.password}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between px-4 py-3">
			<Label for="imap-ssl" class="text-md">Enable SSL</Label>
			<Switch id="imap-ssl" bind:checked={imap.SSL} />
		</div>
	</div>
</div>
