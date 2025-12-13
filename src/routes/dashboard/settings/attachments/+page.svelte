<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Switch } from '$lib/components/ui/switch';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { TagsInput } from '$lib/components/ui/tags-input';
	import { toast } from 'svelte-sonner';
	import type { Attachment, PageData } from '$lib/types';
	import api from '$lib/utils/axios';

	const { data }: { data: PageData & { attachments: Attachment } } = $props();

	let attachments: Attachment = $state(data.attachments);

	async function handleSave() {
		const response = await api.post('/api/settings/attachments', { attachments });
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
							<Field.Label>Allowed File Extensions</Field.Label>
							<TagsInput
								id="allowed-extensions"
								bind:value={attachments.allowedMimeTypes}
								disabled={!attachments.enabled}
							/>
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
