<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { IMAP } from '$lib/types';
	import { ToastComponent } from '$lib/components/ui/toast';
	import { Spinner } from '$lib/components/ui/spinner';

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
			const response = await axios.post('/setup/incoming-email/test', { imap });

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
		if (!imap.host || !imap.port || !imap.username || !imap.password) {
			return toast.error('Please enter IMAP details.');
		}

		const response = await axios.post('', { imap });
		if (response.status < 300) {
			toast.success('Succesfully saved IMAP settings.');
			return;
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		let { data } = await axios.get('');
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
