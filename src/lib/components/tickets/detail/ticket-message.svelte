<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import Page from '$lib/icons/page.svelte';
	import { formatDate } from '$lib/utils/date';
	import type { TicketMessageDetail } from '$lib/types';
	import { page } from '$app/state';
	import { handleDownloadAttachment } from '$lib/utils/download';
	import { toast } from 'svelte-sonner';
	import { ToastComponent } from '$lib/components/ui/toast';
	import axios from 'axios';

	let { messages = $bindable() }: { messages: TicketMessageDetail[] } = $props();

	async function handleDownload(ticketId: number, fileName: string) {
		try {
			await handleDownloadAttachment(ticketId, fileName);
			return toast.success('File downloaded successfully');
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				return toast.error(ToastComponent, {
					componentProps: {
						title: error.response.data.message || 'Download failed',
						body: error.response.data.error || 'Unknown error'
					}
				});
			}
			return toast.error(ToastComponent, {
				componentProps: {
					title: 'Download failed',
					body: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}
</script>

{#each messages as message}
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
			<div class="max-w-full min-w-0 overflow-hidden font-light break-words">
				{@html message.message}
			</div>
			{#if message.messageAttachments.length > 0}
				<div class="mt-auto flex gap-1 overflow-x-auto">
					{#each message.messageAttachments as attachment}
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
