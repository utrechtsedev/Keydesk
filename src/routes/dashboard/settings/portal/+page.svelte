<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import type { PageData, Portal } from '$lib/types';
	import api from '$lib/utils/axios';

	const { data }: { data: PageData & { portal: Portal } } = $props();

	let portal = $state(data.portal);

	async function handleNext() {
		await api.post('/api/settings/portal', { ...portal });
		toast.success('Succesfully saved portal settings.');
	}
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Portal Access</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Control access to your customer-facing support portal.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Enable Portal</Field.Label>
									<Field.Description>
										Allow customers to access the support portal and submit tickets
									</Field.Description>
								</div>
								<Switch id="enable-portal" bind:checked={portal.enabled} />
							</div>
						</Field.Set>
					</div>
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Enable Guest Tickets</Field.Label>
									<Field.Description>
										Allow users to submit tickets without creating an account
									</Field.Description>
								</div>
								<Switch id="allow-guest-tickets" bind:checked={portal.allowGuestTickets} />
							</div>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Security</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure security and verification requirements for portal users.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Require Email Verification</Field.Label>
									<Field.Description>
										Users must verify their email address before accessing the portal
									</Field.Description>
								</div>
								<Switch
									id="require-email-verification"
									bind:checked={portal.requireEmailVerification}
								/>
							</div>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Features</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Enable or disable additional portal features for your customers.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Show Knowledge Base</Field.Label>
									<Field.Description>
										Display the knowledge base in the portal for self-service support
									</Field.Description>
								</div>
								<Switch id="show-knowledge-base" bind:checked={portal.showKnowledgeBase} />
							</div>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex items-center justify-end space-x-4">
			<Button type="button" class="whitespace-nowrap" onclick={handleNext}>Save settings</Button>
		</div>
	</form>
</div>
