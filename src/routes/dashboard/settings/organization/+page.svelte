<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Field from '$lib/components/ui/field';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import axios from 'axios';
	import { timezones } from '$lib/utils/timezones';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { Organization } from '$lib/types';
	import Upload4 from '$lib/icons/upload-4.svelte';
	import Check2 from '$lib/icons/check-2.svelte';
	import { CountrySelector } from '$lib/components/ui/country-select';

	let organization: Organization = $state({
		name: '',
		domain: '',
		language: '',
		timezone: '',
		country: '',
		address: '',
		city: '',
		zipCode: ''
	});

	let fileInput: HTMLInputElement | undefined = $state();
	let previewUrl = $state<string | null>(null);
	let uploading = $state(false);

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			uploading = true;

			const formData = new FormData();
			formData.append('image', file);

			try {
				await axios.post('/logo', formData, {
					headers: {
						'Content-Type': 'multipart/form-data'
					}
				});

				previewUrl = `/logo?t=${Date.now()}`;
			} catch (error) {
				alert('Image too large');
			} finally {
				uploading = false;
			}
		}
	}

	const triggerContent = $derived(
		timezones.find((f) => f.value === organization.timezone)?.label ?? 'Select a timezone'
	);

	async function handleNext() {
		if (
			!organization.name ||
			!organization.domain ||
			!organization.language ||
			!organization.timezone
		)
			return toast.error('Fill in all required fields.');

		const response = await axios.post('/api/settings/organization', { organization });

		if (response.status < 300) {
			toast.success('Succesfully saved organization settings.');
			return;
		}
		return toast.error('Error saving configuration.');
	}

	onMount(async () => {
		let { data } = await axios.get('/api/settings/organization');

		if (data.data) {
			organization = data.data;
			previewUrl = `/logo`;
		}
	});
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Basic Information</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Set your public portal configuration and organization details.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Organization Name</Field.Label>
							<Input type="text" placeholder="Acme Inc." required bind:value={organization.name} />
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Domain Name</Field.Label>
							<Input
								type="text"
								placeholder="https://example.com"
								required
								bind:value={organization.domain}
							/>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Language</Field.Label>
							<Select.Root type="single" name="language">
								<Select.Trigger>
									{organization.language ?? 'Choose language'}
								</Select.Trigger>
								<Select.Content>
									<Select.Group>
										<Select.Label>Language</Select.Label>
										<Select.Item value="nl" onclick={() => (organization.language = 'nl')}>
											Dutch
										</Select.Item>
										<Select.Item value="en" onclick={() => (organization.language = 'en')}>
											English
										</Select.Item>
									</Select.Group>
								</Select.Content>
							</Select.Root>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Timezone</Field.Label>
							<Select.Root type="single" name="timezone" bind:value={organization.timezone}>
								<Select.Trigger>
									{triggerContent}
								</Select.Trigger>
								<Select.Content>
									<Select.Group>
										<Select.Label>Timezones</Select.Label>
										{#each timezones as timezone (timezone.value)}
											<Select.Item value={timezone.value} label={timezone.label}>
												{timezone.label}
											</Select.Item>
										{/each}
									</Select.Group>
								</Select.Content>
							</Select.Root>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Location Details</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Provide your organization's physical location information.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Country</Field.Label>
							<CountrySelector bind:value={organization.country} />
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>City</Field.Label>
							<Input bind:value={organization.city} placeholder="Please enter your city" />
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Address</Field.Label>
							<Input bind:value={organization.address} placeholder="Please enter your address" />
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Zipcode</Field.Label>
							<Input bind:value={organization.zipCode} placeholder="Please enter your Zipcode" />
						</Field.Set>
					</div>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Branding</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Upload your organization logo for the portal.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<Field.Set class="gap-2">
					<Field.Label>Logo (512x512)</Field.Label>
					{#if !previewUrl}
						<Button
							type="button"
							onclick={() => fileInput?.click()}
							disabled={uploading}
							variant="secondary"
							class="w-fit"
						>
							{uploading ? 'Uploading...' : 'Upload Logo'}
							<Upload4 />
						</Button>
					{:else}
						<div class="flex items-center gap-4">
							<img src={previewUrl} alt="Organization logo" class="h-16 w-16 rounded-md" />
							<Button
								type="button"
								onclick={() => fileInput?.click()}
								disabled={uploading}
								variant="secondary"
							>
								Change Logo
								<Check2 />
							</Button>
						</div>
					{/if}
					<Field.Description>
						Upload a square logo image (512x512 recommended) for your organization.
					</Field.Description>
				</Field.Set>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex items-center justify-end space-x-4">
			<Button type="button" variant="outline" class="whitespace-nowrap">Cancel</Button>
			<Button type="button" class="whitespace-nowrap" onclick={handleNext}>Save settings</Button>
		</div>
	</form>
</div>

<input
	type="file"
	accept="image/*"
	onchange={handleFileSelect}
	bind:this={fileInput}
	class="hidden"
/>
