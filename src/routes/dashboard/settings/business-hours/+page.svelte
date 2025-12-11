<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
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
		return toast.error('Error saving configuration.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/business-hours');
		if (data.data) businessHours = data.data;
	});
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Weekly Schedule</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Configure your support team's availability throughout the week. These hours will be used
					for SLA calculations and customer expectations.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="space-y-3">
					{#each Object.entries(businessHours.schedule) as [day, hours]}
						<div
							class="flex min-h-[60px] items-center justify-between rounded-lg border bg-card p-4"
						>
							<div class="flex items-center gap-4">
								<Field.Label class="w-28 text-base font-medium capitalize">{day}</Field.Label>
								<div class="flex items-center gap-2">
									<Switch bind:checked={hours.enabled} id="switch-{day}" />
									<span class="text-sm text-muted-foreground">
										{hours.enabled ? 'Open' : 'Closed'}
									</span>
								</div>
							</div>
							<div class="flex h-10 items-center">
								{#if hours.enabled}
									<div class="flex items-center gap-2">
										<Input type="time" bind:value={hours.start} class="w-32" id="start-{day}" />
										<span class="text-sm text-muted-foreground">to</span>
										<Input type="time" bind:value={hours.end} class="w-32" id="end-{day}" />
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">Not available</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
				<Field.Description class="pt-2">
					Times are displayed in your organization's timezone. Toggle each day to enable or disable
					support hours.
				</Field.Description>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex items-center justify-end space-x-4">
			<Button type="button" variant="outline" class="whitespace-nowrap">Cancel</Button>
			<Button type="button" class="whitespace-nowrap" onclick={handleSave}>Save settings</Button>
		</div>
	</form>
</div>
