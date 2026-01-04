<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { timezones } from '$lib/utils/timezones';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { Organization } from '$lib/types';
	import { goto } from '$app/navigation';
	import Upload4 from '$lib/icons/upload-4.svelte';
	import Check2 from '$lib/icons/check-2.svelte';
	import { CountrySelector } from '$lib/components/ui/country-select';
	import api from '$lib/utils/axios';

	let organization: Organization = $state({
		name: '',
		domain: '',
		language: '',
		timezone: '',
		address: '',
		zipCode: '',
		city: '',
		country: ''
	});

	let fileInput: HTMLInputElement | undefined = $state();
	let uploading = $state(false);

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			uploading = true;

			const formData = new FormData();
			formData.append('image', file);

			try {
				await api.post('/logo', formData, {
					headers: {
						'Content-Type': 'multipart/form-data'
					}
				});
			} catch {
				alert('Image too large');
			} finally {
				uploading = false;
				await checkLogo();
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

		await api.post('', { ...organization });
		toast.success('Succesfully saved organization settings.');
		return goto('/setup/outgoing-email');
	}

	let hasLogo = $state(false);

	async function checkLogo() {
		await api.get('/logo');
		hasLogo = true;
	}

	onMount(async () => {
		let { data } = await api.get('');
		if (data.data) organization = data.data;
		await checkLogo();
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Organization Settings</h1>
			<p class="text-sm text-muted-foreground">Set your public portal configuration</p>
		</div>
		<Button onclick={handleNext}>Save</Button>
	</div>
	<div class="grid">
		<div class="flex justify-between border-y px-4 py-3">
			<Label for="organization" class="text-md">Organization Name</Label>
			<Input
				id="organization"
				type="text"
				placeholder="Acme Inc."
				required
				bind:value={organization.name}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="domain" class="text-md">Domainname</Label>
			<Input
				id="domain"
				type="text"
				placeholder="https://example.com"
				required
				bind:value={organization.domain}
				class="w-[40%]"
			/>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="language" class="text-md">Language</Label>
			<Select.Root type="single" name="language">
				<Select.Trigger class="w-[40%]! max-w-[40%] **:data-[slot=select-value]:max-w-full">
					{organization.language ?? 'Choose language'}
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Language</Select.Label>
						<Select.Item value="nl" onclick={() => (organization.language = 'nl')}
							>Dutch</Select.Item
						>
						<Select.Item value="en" onclick={() => (organization.language = 'en')}
							>English</Select.Item
						>
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="timezone" class="text-md">Timezone</Label>
			<Select.Root type="single" name="favoriteFruit" bind:value={organization.timezone}>
				<Select.Trigger class="w-[50%]">
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
		</div>

		<div class="flex justify-between border-b px-4 py-3">
			<Label for="country" class="text-md">Country</Label>
			<CountrySelector bind:value={organization.country} class="w-[40%]" />
		</div>

		<div class="flex justify-between border-b px-4 py-3">
			<Label for="city" class="text-md">City</Label>
			<Input bind:value={organization.city} placeholder="Please enter your city" class="w-[40%]" />
		</div>

		<div class="flex justify-between border-b px-4 py-3">
			<Label for="city" class="text-md">Address</Label>
			<Input
				bind:value={organization.address}
				placeholder="Please enter your address"
				class="w-[40%]"
			/>
		</div>

		<div class="flex justify-between border-b px-4 py-3">
			<Label for="city" class="text-md">Zipcode</Label>
			<Input
				bind:value={organization.zipCode}
				placeholder="Please enter your Zipcode"
				class="w-[40%]"
			/>
		</div>

		<div class="flex justify-between px-4 py-3">
			<Label for="logo" class="text-md">Logo (512x512)</Label>
			{#if !hasLogo}
				<Button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={uploading}
					variant="secondary"
				>
					{uploading ? 'Uploading...' : 'Upload Logo'}
					<Upload4 />
				</Button>
			{:else}
				<Button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={uploading}
					variant="secondary"
				>
					Uploaded
					<Check2 />
				</Button>
			{/if}
		</div>
	</div>
</div>
<input
	type="file"
	accept="image/*"
	onchange={handleFileSelect}
	bind:this={fileInput}
	class="hidden"
/>
