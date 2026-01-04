<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import type { IMAP, PageData } from '$lib/types';
	import { Spinner } from '$lib/components/ui/spinner';
	import api from '$lib/utils/axios';

	const { data }: { data: PageData & { imap: IMAP } } = $props();

	// svelte-ignore state_referenced_locally
	let imap: IMAP = $state(data.imap);

	let saveDisabled = $state(true);
	let testLoading = $state('hidden');

	async function testConfiguration() {
		testLoading = '';
		try {
			const response = await api.post('/api/settings/incoming-email/test', { ...imap });
			saveDisabled = false;
			return toast.success(response.data.message);
		} finally {
			testLoading = 'hidden';
		}
	}

	async function handleNext() {
		if (!imap.host || !imap.port || !imap.username || !imap.password) {
			return toast.error('Please enter IMAP details.');
		}
		await api.post('/api/settings/incoming-email', { imap });
		toast.success('Succesfully saved IMAP settings.');
	}
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">IMAP Server Settings</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure your IMAP server connection to receive incoming emails.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-4">
						<Field.Set class="gap-2">
							<Field.Label>IMAP Host</Field.Label>
							<Input
								id="imap-host"
								type="text"
								placeholder="localhost"
								required
								bind:value={imap.host}
							/>
							<Field.Description>The hostname or IP address of your IMAP server</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-2">
						<Field.Set class="gap-2">
							<Field.Label>IMAP Port</Field.Label>
							<Input
								id="imap-port"
								type="number"
								placeholder="993"
								required
								bind:value={imap.port}
							/>
							<Field.Description>Common ports: 993 (SSL), 143 (non-SSL)</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Enable SSL</Field.Label>
									<Field.Description>
										Use SSL/TLS encryption for secure email retrieval
									</Field.Description>
								</div>
								<Switch id="imap-ssl" bind:checked={imap.SSL} />
							</div>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Authentication</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Provide credentials to authenticate with your IMAP server.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>IMAP Username</Field.Label>
							<Input
								id="imap-username"
								type="text"
								placeholder="user@example.com"
								required
								bind:value={imap.username}
							/>
							<Field.Description>Username for IMAP authentication</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>IMAP Password</Field.Label>
							<Input
								id="imap-password"
								type="password"
								placeholder="*********"
								required
								bind:value={imap.password}
							/>
							<Field.Description>Password for IMAP authentication</Field.Description>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex items-center justify-end space-x-4">
			<Button
				type="button"
				variant="secondary"
				class="whitespace-nowrap"
				onclick={testConfiguration}
			>
				Test Connection
				<Spinner class={testLoading} />
			</Button>
			<Button type="button" class="whitespace-nowrap" disabled={saveDisabled} onclick={handleNext}>
				Save settings
			</Button>
		</div>
	</form>
</div>
