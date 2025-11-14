<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Input } from '$lib/components/ui/input';
	import { TagsInput } from '$lib/components/ui/tags-input';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import type { Attachment } from '$lib/types';

	let disabled = $state(false);

	let attachments: Attachment = $state({
		enabled: true,
		maxFileSizeMB: 10,
		allowedMimeTypes: [
			'jpg',
			'jpeg',
			'png',
			'gif',
			'pdf',
			'doc',
			'docx',
			'xls',
			'xlsx',
			'txt',
			'zip'
		]
	});

	function handlePrevious() {
		setState(10);
	}
	async function handleNext() {
		const response = await axios.post('/api/admin/attachment', { attachments });
		if (response.status < 300) {
			return setState(12);
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}
	onMount(async () => {
		const { data } = await axios.get('/api/admin/attachment');
		if (data.data) attachments = data.data;
	});

	$effect(() => {
		if (!attachments.enabled) {
			disabled = true;
			attachments.allowedMimeTypes = [];
			attachments.maxFileSizeMB = 0;
		} else {
			disabled = false;
		}
	});
</script>

<div class="flex min-h-[72dvh] flex-col gap-6">
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Attachments Settings</h1>
	</div>

	<div class="flex flex-col items-center gap-6">
		<div class="flex items-center gap-3">
			<Label for="enable-attachments">Enable Attachments:</Label>
			<Switch id="enable-attachments" bind:checked={attachments.enabled} />
		</div>
		<div class="flex items-center gap-3">
			<Label for="max-filesize">Max Filesize (MB):</Label>
			<Input
				{disabled}
				bind:value={attachments.maxFileSizeMB}
				id="max-filesize"
				type="number"
				class="w-24"
			/>
		</div>
		<div class="flex flex-col items-center gap-3">
			<Label for="allowed-extensions">Allowed File Extensions:</Label>
			<TagsInput
				id="allowed-extensions"
				bind:value={attachments.allowedMimeTypes}
				class="w-96"
				{disabled}
			/>
		</div>
	</div>

	<div class="mt-auto flex justify-between gap-4">
		<Button onclick={handlePrevious} variant="outline">Previous</Button>
		<Progress value={82.5} class="mt-3" />
		<Button onclick={handleNext}>Next</Button>
	</div>
</div>
