<script lang="ts">
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

	async function handleSave() {
		const response = await axios.post('/api/settings/attachments', { attachments });

		if (response.status < 300) {
			toast.success('Successfully saved attachment settings.');
			return;
		}

		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/attachments');
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

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Attachment Settings</h1>
			<p class="text-sm text-muted-foreground">Configure file upload settings</p>
		</div>
		<Button onclick={handleSave}>Save</Button>
	</div>

	<div class="grid">
		<div class="flex justify-between border-y px-4 py-3">
			<Label for="enable-attachments" class="text-md">Enable Attachments</Label>
			<Switch id="enable-attachments" bind:checked={attachments.enabled} />
		</div>

		<div class="flex justify-between border-b px-4 py-3">
			<Label for="max-filesize" class="text-md">Max Filesize (MB)</Label>
			<Input
				{disabled}
				bind:value={attachments.maxFileSizeMB}
				id="max-filesize"
				type="number"
				class="w-[15%]"
			/>
		</div>

		<div class="flex justify-between px-4 py-3">
			<Label for="allowed-extensions" class="text-md">Allowed File Extensions</Label>
			<TagsInput
				id="allowed-extensions"
				bind:value={attachments.allowedMimeTypes}
				class="w-[40%]"
				{disabled}
			/>
		</div>
	</div>
</div>
