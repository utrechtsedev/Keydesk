<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import type { PageData, SMTP } from '$lib/types';
	import { Spinner } from '$lib/components/ui/spinner';
	import api from '$lib/utils/axios';

	const { data }: { data: PageData & { smtp: SMTP } } = $props();

	// svelte-ignore state_referenced_locally
	let smtp: SMTP = $state(data.smtp);

	let saveDisabled = $state(true);
	let testLoading = $state('hidden');

	async function testConfiguration() {
		testLoading = '';
		try {
			const response = await api.post('/api/settings/outgoing-email/test', { smtp });
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

		await api.post('/api/settings/outgoing-email', { ...smtp });
		toast.success('Succesfully saved SMTP settings.');
	}

	$effect(() => {
		if (!smtp.enableAuthentication) {
			smtp.username = '';
			smtp.password = '';
		}
	});
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Sender Information</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure the sender name and email address for outgoing emails.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>SMTP Sender Name</Field.Label>
							<Input
								id="smtp-name"
								type="text"
								placeholder="Acme Inc."
								required
								bind:value={smtp.senderName}
							/>
							<Field.Description>
								The name that appears in the "From" field of emails
							</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>SMTP Sender Email</Field.Label>
							<Input
								id="smtp-sender"
								type="email"
								placeholder="user@example.com"
								required
								bind:value={smtp.senderEmail}
							/>
							<Field.Description>The email address used in the "From" field</Field.Description>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">SMTP Server Settings</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure your SMTP server connection details.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-4">
						<Field.Set class="gap-2">
							<Field.Label>SMTP Host</Field.Label>
							<Input
								id="smtp-host"
								type="text"
								placeholder="localhost"
								required
								bind:value={smtp.host}
							/>
							<Field.Description>The hostname or IP address of your SMTP server</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-2">
						<Field.Set class="gap-2">
							<Field.Label>SMTP Port</Field.Label>
							<Input
								id="smtp-port"
								type="number"
								placeholder="587"
								required
								bind:value={smtp.port}
							/>
							<Field.Description>Common ports: 587 (TLS), 465 (SSL)</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Enable SSL</Field.Label>
									<Field.Description>
										Use SSL/TLS encryption for secure email transmission
									</Field.Description>
								</div>
								<Switch id="smtp-ssl" bind:checked={smtp.SSL} />
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
					Configure SMTP authentication credentials if required by your server.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Enable Authentication</Field.Label>
									<Field.Description>
										Require username and password to connect to the SMTP server
									</Field.Description>
								</div>
								<Switch id="smtp-authentication" bind:checked={smtp.enableAuthentication} />
							</div>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>SMTP Username</Field.Label>
							<Input
								id="smtp-username"
								type="text"
								placeholder="user@example.com"
								required
								bind:value={smtp.username}
								disabled={!smtp.enableAuthentication}
							/>
							<Field.Description>Username for SMTP authentication</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>SMTP Password</Field.Label>
							<Input
								id="smtp-password"
								type="password"
								placeholder="*********"
								required
								bind:value={smtp.password}
								disabled={!smtp.enableAuthentication}
							/>
							<Field.Description>Password for SMTP authentication</Field.Description>
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
