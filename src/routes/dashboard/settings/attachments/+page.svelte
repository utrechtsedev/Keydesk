<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Switch } from '$lib/components/ui/switch';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import type { Attachment, PageData } from '$lib/types';
	import api from '$lib/utils/axios';
	import Plus from '$lib/icons/plus.svelte';
	import Xmark from '$lib/icons/xmark.svelte';

	const { data }: { data: PageData & { attachments: Attachment } } = $props();

	// svelte-ignore state_referenced_locally
	let attachments: Attachment = $state(data.attachments);
	let newMimeType = $state('');

	function addMimeType() {
		if (!newMimeType.trim()) return;

		if (!attachments.allowedMimeTypes) {
			attachments.allowedMimeTypes = [];
		}

		if (attachments.allowedMimeTypes.includes(newMimeType.trim())) {
			toast.error('MIME type already exists');
			return;
		}

		attachments.allowedMimeTypes = [...attachments.allowedMimeTypes, newMimeType.trim()];
		newMimeType = '';
	}

	function removeMimeType(index: number) {
		if (!attachments.allowedMimeTypes) return;
		attachments.allowedMimeTypes = attachments.allowedMimeTypes.filter((_, i) => i !== index);
	}

	async function handleSave() {
		await api.post('/api/settings/attachments', { ...attachments });
		toast.success('Successfully saved attachment settings.');
	}
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Attachment Settings</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure file upload settings for tickets and messages.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Field.Label>Enable Attachments</Field.Label>
									<Field.Description>
										Allow users to upload files with their tickets and messages
									</Field.Description>
								</div>
								<Switch id="enable-attachments" bind:checked={attachments.enabled} />
							</div>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>
		<Separator class="my-8" />
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Upload Limits</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Set file size limits and allowed file types.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Max File Size (MB)</Field.Label>
							<Input
								disabled={!attachments.enabled}
								bind:value={attachments.maxFileSizeMB}
								id="max-filesize"
								type="number"
							/>
							<Field.Description>
								Maximum file size allowed per attachment in megabytes
							</Field.Description>
						</Field.Set>
					</div>
					<div class="col-span-full">
						<Field.Set class="gap-2">
							<Field.Label>Allowed MIME Types</Field.Label>
							<div class="flex gap-2">
								<Input
									bind:value={newMimeType}
									disabled={!attachments.enabled}
									placeholder="e.g. image/png, application/pdf"
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addMimeType();
										}
									}}
								/>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={!attachments.enabled}
									onclick={addMimeType}
								>
									<Plus />
								</Button>
							</div>
							{#if attachments.allowedMimeTypes && attachments.allowedMimeTypes.length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each attachments.allowedMimeTypes as mimeType, index (index)}
										<Badge variant="secondary" class="gap-1">
											{mimeType}
											<button
												type="button"
												onclick={() => removeMimeType(index)}
												class="ml-1 rounded-full hover:bg-muted"
											>
												<Xmark class="h-3 w-3" />
											</button>
										</Badge>
									{/each}
								</div>
							{/if}
							<Field.Description>
								Specify which file types users can upload (MIME types)
							</Field.Description>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>
		<Separator class="my-8" />
		<div class="flex items-center justify-end space-x-4">
			<Button type="button" variant="outline" class="whitespace-nowrap">Cancel</Button>
			<Button type="button" class="whitespace-nowrap" onclick={handleSave}>Save settings</Button>
		</div>
	</form>
</div>
