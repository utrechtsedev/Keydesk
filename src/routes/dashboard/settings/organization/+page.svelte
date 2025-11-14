<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import axios from 'axios';
	import { timezones } from '$lib/utils/timezones';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { Organization } from '$lib/types';
	import Upload4 from '$lib/icons/upload-4.svelte';
	import Check2 from '$lib/icons/check-2.svelte';

	let organization: Organization = $state({
		name: '',
		domain: '',
		language: '',
		timezone: ''
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
				console.error('Failed to upload image:', error);
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
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		let { data } = await axios.get('/api/settings/organization');

		if (data.data) {
			organization = data.data;
			previewUrl = `/logo`;
		}
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
				<Select.Trigger class="!w-[40%] max-w-[40%] [&_[data-slot=select-value]]:max-w-full">
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
		<div class="flex justify-between px-4 py-3">
			<Label for="logo" class="text-md">Logo (512x512)</Label>
			{#if !previewUrl}
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
