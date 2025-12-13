<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import type { Portal } from '$lib/types';
	import { goto } from '$app/navigation';
	import api from '$lib/utils/axios';

	let portal: Portal = $state({
		enabled: true,
		allowGuestTickets: true,
		requireEmailVerification: false,
		showKnowledgeBase: true
	});

	async function handleNext() {
		await api.post('', { portal });
		toast.success('Succesfully saved portal settings.');
		return goto('/setup/admin-account');
	}
	onMount(async () => {
		const { data } = await api.get('');

		if (data.data) portal = data.data;
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Portal Settings</h1>
			<p class="text-sm text-muted-foreground">Set your public portal configuration</p>
		</div>
		<Button onclick={handleNext}>Save</Button>
	</div>

	<div class="grid">
		<div class="flex justify-between border-y px-4 py-3">
			<Label for="enable-portal" class="text-md">Enable Portal:</Label>
			<Switch id="enable-portal" bind:checked={portal.enabled} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="allow-guest-tickets" class="text-md">Enable Guest Tickets:</Label>
			<Switch id="allow-guest-tickets" bind:checked={portal.allowGuestTickets} />
		</div>
		<div class="flex justify-between border-b px-4 py-3">
			<Label for="require-email-verification" class="text-md">Require Email Verification:</Label>
			<Switch id="require-email-verification" bind:checked={portal.requireEmailVerification} />
		</div>
		<div class="flex justify-between px-4 py-3">
			<Label for="show-knowlegde-base" class="text-md">Show Knowledge Base:</Label>
			<Switch id="show-knowlegde-base" bind:checked={portal.showKnowledgeBase} />
		</div>
	</div>
</div>
