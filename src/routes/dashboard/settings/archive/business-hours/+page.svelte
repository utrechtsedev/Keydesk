<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import axios from 'axios';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import type { BusinessHours } from '$lib/types';
	import { goto } from '$app/navigation';

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

	function handlePrevious() {
		goto('/setup/notifications');
	}
	async function handleNext() {
		const response = await axios.post('/api/admin/businesshours', { businessHours });
		if (response.status < 300) {
			return goto('/setup/holidays');
		}
		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}
	onMount(async () => {
		const { data } = await axios.get('/api/admin/businesshours');
		if (data.data) businessHours = data.data;
	});
</script>

<div class="flex min-h-[72dvh] flex-col gap-6">
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Business Hours</h1>
		<p class="text-sm text-muted-foreground">Set your support availability</p>
	</div>

	<div class="flex-1 overflow-y-auto">
		<div class="flex flex-col items-center gap-4">
			{#each Object.entries(businessHours.schedule) as [day, hours]}
				<div class="grid grid-cols-[140px_60px_1fr] items-center gap-4">
					<div class="flex items-center justify-between">
						<Label class="font-medium capitalize">{day}</Label>
						<Switch bind:checked={hours.enabled} class="ml-auto" />
					</div>

					{#if hours.enabled}
						<div class="col-span-2 flex items-center gap-2">
							<Input type="time" bind:value={hours.start} class="w-28" disabled={!hours.enabled} />
							<span class="text-muted-foreground">to</span>
							<Input type="time" bind:value={hours.end} class="w-28" disabled={!hours.enabled} />
						</div>
					{:else}
						<div class="col-span-2 text-sm text-muted-foreground">Closed</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
	<div class="mt-auto flex justify-between gap-4">
		<Button onclick={handlePrevious} variant="outline">Previous</Button>
		<Progress value={52.5} class="mt-3" />
		<Button onclick={handleNext}>Next</Button>
	</div>
</div>
