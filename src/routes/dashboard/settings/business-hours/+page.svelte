<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import type { BusinessHours } from '$lib/types';

	let businessHours: BusinessHours = $state({
		schedule: {
			monday: {
				enabled: true,
				start: '09:00',
				end: '17:00'
			},
			tuesday: {
				enabled: true,
				start: '09:00',
				end: '17:00'
			},
			wednesday: {
				enabled: true,
				start: '09:00',
				end: '17:00'
			},
			thursday: {
				enabled: true,
				start: '09:00',
				end: '17:00'
			},
			friday: {
				enabled: true,
				start: '09:00',
				end: '17:00'
			},
			saturday: {
				enabled: false,
				start: null,
				end: null
			},
			sunday: {
				enabled: false,
				start: null,
				end: null
			}
		}
	});

	async function handleSave() {
		const response = await axios.post('/api/settings/business-hours', { businessHours });

		if (response.status < 300) {
			toast.success('Successfully saved business hours.');
			return;
		}

		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/business-hours');
		if (data.data) businessHours = data.data;
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Business Hours</h1>
			<p class="text-sm text-muted-foreground">Set your support availability</p>
		</div>
		<Button onclick={handleSave}>Save</Button>
	</div>

	<div class="grid">
		{#each Object.entries(businessHours.schedule) as [day, hours], index}
			{@const isFirst = index === 0}
			<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
				<div class="flex items-center gap-3">
					<Label class="text-md w-24 font-medium capitalize">{day}</Label>
					<Switch bind:checked={hours.enabled} />
				</div>

				{#if hours.enabled}
					<div class="flex items-center gap-2">
						<Input type="time" bind:value={hours.start} class="w-32" />
						<span class="text-sm text-muted-foreground">to</span>
						<Input type="time" bind:value={hours.end} class="w-32" />
					</div>
				{:else}
					<span class="text-sm text-muted-foreground">Closed</span>
				{/if}
			</div>
		{/each}
	</div>
</div>
