<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import { MessageInput } from '$lib/components/ui/messageinput';
	import { Switch } from '$lib/components/ui/switch';
	import Page from '$lib/icons/page.svelte';
	import Plus from '$lib/icons/plus.svelte';
	import PaperPlane from '$lib/icons/paper-plane.svelte';
	import { XIcon } from '@lucide/svelte';
	import { displaySize } from '$lib/components/ui/file-drop-zone';
	import { slide, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let {
		value = $bindable(),
		isPrivate = $bindable(),
		selectedFiles = $bindable<File[]>([]),
		highlightMessageInput = $bindable(false),
		handleNewMessage
	}: {
		value: string;
		isPrivate: boolean;
		selectedFiles: File[];
		highlightMessageInput?: boolean;
		handleNewMessage?: () => Promise<any>;
	} = $props();

	let fileInputId = 'file-input-' + Math.random().toString(36).slice(2);
	let isDragging = $state(false);

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			addFiles(Array.from(input.files));
			input.value = '';
		}
	}

	function addFiles(files: File[]) {
		const newFiles = files.filter(
			(file) => !selectedFiles.some((f) => f.name === file.name && f.size === file.size)
		);
		selectedFiles = [...selectedFiles, ...newFiles];
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		if (event.dataTransfer?.files) {
			addFiles(Array.from(event.dataTransfer.files));
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}
</script>

<Card.Root
	class="w-full min-w-0 gap-2 p-1 transition-colors {isDragging
		? 'border-primary bg-accent/50'
		: ''}"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
>
	{#if selectedFiles.length > 0}
		<div
			class="flex gap-1 overflow-x-auto px-1 pt-1"
			transition:slide={{ duration: 300, easing: quintOut }}
		>
			{#each selectedFiles as file, index (file.name + file.size)}
				<div
					class="flex shrink-0 items-center gap-2 rounded-xl border bg-gray-100 px-2 py-1 whitespace-nowrap shadow-lg dark:bg-input/30"
					transition:scale={{ duration: 200, easing: quintOut, start: 0.8 }}
				>
					<Page />
					<div class="flex flex-col">
						<span class="text-sm">{file.name}</span>
						<span class="text-xs text-muted-foreground">{displaySize(file.size)}</span>
					</div>
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger class="cursor-pointer" onclick={() => removeFile(index)}>
								<XIcon class="transition-all hover:text-red-500" size="16" />
							</Tooltip.Trigger>
							<Tooltip.Content>Remove file</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				</div>
			{/each}
		</div>
	{/if}

	<MessageInput bind:value class={highlightMessageInput ? 'border-red-600' : ''}>
		<div class="flex w-full items-center justify-between">
			<div
				class="flex shrink-0 items-center gap-2 rounded-xl border bg-gray-100 px-2 py-1 whitespace-nowrap shadow-lg dark:bg-input/30"
			>
				<Switch bind:checked={isPrivate} class="cursor-pointer" />
				Private Note
			</div>
			<div class="flex gap-1">
				<input id={fileInputId} type="file" multiple class="hidden" onchange={handleFileSelect} />
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button
								variant="outline"
								class="cursor-pointer"
								onclick={() => document.getElementById(fileInputId)?.click()}
							>
								<Plus />
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content>Attach files</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				{#if handleNewMessage}
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger>
								<Button variant="outline" class="cursor-pointer" onclick={handleNewMessage}>
									<PaperPlane />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>Send message</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{/if}
			</div>
		</div>
	</MessageInput>
</Card.Root>
