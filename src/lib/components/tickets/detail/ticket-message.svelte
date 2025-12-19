<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import Page from '$lib/icons/page.svelte';
	import { formatDate } from '$lib/utils/date';
	import type { TicketMessageDetail } from '$lib/types';
	import { page } from '$app/state';
	import { handleDownloadAttachment } from '$lib/utils/download';
	import { toast } from 'svelte-sonner';

	let { messages = $bindable() }: { messages: TicketMessageDetail[] } = $props();

	async function handleDownload(ticketId: number, fileName: string) {
		await handleDownloadAttachment(ticketId, fileName);
		return toast.success('File downloaded successfully');
	}
</script>

{#each messages as message (message.id)}
	<Card.Root>
		<Card.Content class="flex flex-col space-y-2">
			{#if message.messageUser}
				<div class="flex items-center justify-between">
					<div class="flex gap-2">
						<span class="text-lg">{message.messageUser.name} (agent)</span>
						{#if message.isPrivate}
							<Badge class="shrink-0">Private</Badge>
						{/if}
					</div>
					<span class="text-sm font-light">{formatDate(message.createdAt)}</span>
				</div>
			{:else if message.messageRequester}
				<div class="flex items-center justify-between">
					<div class="flex gap-2">
						<span class="text-lg">{message.messageRequester.name}</span>
					</div>
					<span class="text-sm font-light">{formatDate(message.createdAt)}</span>
				</div>
			{:else if message.senderType === 'system'}
				<div class="flex items-center justify-between space-y-2">
					<div class="flex gap-2">
						<span class="text-lg font-bold">SYSTEM</span>
						<Badge class="shrink-0">Private</Badge>
					</div>
					<span class="text-sm font-light">{formatDate(message.createdAt)}</span>
				</div>
			{/if}
			<div class="max-w-full min-w-0 overflow-hidden font-light wrap-break-word">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html message.message}
			</div>
			{#if message.messageAttachments.length > 0}
				<div class="mt-auto flex gap-1 overflow-x-auto">
					{#each message.messageAttachments as attachment (attachment.id)}
						<div
							class="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border bg-gray-100 px-2 py-1 whitespace-nowrap shadow-lg dark:bg-input/30"
							role="button"
							tabindex="0"
							onclick={() => handleDownload(Number(page.params.id), attachment.fileName)}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
								}
							}}
						>
							<Page />
							<span>{attachment.originalFileName}</span>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
{/each}
