<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Pencil, PlaneTakeoff, Plus, Save, Trash } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Holiday } from '$lib/types';
	import { goto } from '$app/navigation';

	let holidays: Holiday[] = $state([
		{
			id: 1,
			name: 'Christmas',
			start: new Date('2024-12-25T00:00'),
			end: new Date('2024-12-25T23:59')
		}
	]);

	let editingId: number = $state(0);
	function startEdit(item: Holiday) {
		editingId = item.id;
	}

	function saveEdit() {
		let currentEditing = holidays.find((p) => p.id === editingId);
		if (!currentEditing || currentEditing.name.length < 1)
			return toast.error('Holiday name must be at least 1 character');
		editingId = 0;
	}

	function addItem(array: Holiday[]) {
		const maxId = array.length > 0 ? Math.max(...array.map((obj) => obj.id)) : 0;
		const newItem: Holiday = {
			id: maxId + 1,
			name: 'Sample Holiday',
			start: new Date(),
			end: new Date()
		};
		array.push(newItem);

		return newItem;
	}

	function deleteItem(item: Holiday) {
		holidays = holidays.filter((i) => i.id !== item.id);
		editingId = 0;
	}

	function dateToDatetimeLocal(date: Date): string {
		if (!date) return '';
		const offset = date.getTimezoneOffset() * 60000;
		const localDate = new Date(date.getTime() - offset);
		return localDate.toISOString().slice(0, 16);
	}

	function datetimeLocalToDate(dateStr: string): Date {
		return dateStr ? new Date(dateStr) : new Date();
	}

	function updateHolidayStart(holiday: Holiday, dateStr: string) {
		holiday.start = datetimeLocalToDate(dateStr);
	}

	function updateHolidayEnd(holiday: Holiday, dateStr: string) {
		holiday.end = datetimeLocalToDate(dateStr);
	}

	function handlePrevious() {
		goto('/setup/business-hours');
	}
	async function handleNext() {
		const response = await axios.post('/api/admin/holiday', { holidays });

		if (response.status < 300) {
			return goto('/setup/departments');
		}

		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/admin/holiday');

		if (data.data)
			holidays = data.data.map((h: Holiday) => ({
				...h,
				start: new Date(h.start),
				end: new Date(h.end)
			}));
	});
</script>

<div class="flex min-h-[72dvh] flex-col gap-6">
	<div class="relative flex items-center justify-center">
		<div>
			<h1 class="text-2xl font-bold">Holiday Settings</h1>
			<p class="text-sm text-muted-foreground">Set your holidays (DD-MM-YYYY)</p>
		</div>
		<Button class="absolute right-0" onclick={() => addItem(holidays)}>
			<Plus />Add
		</Button>
	</div>

	<div class="flex flex-col justify-center gap-4">
		{#each holidays as holiday}
			<Card.Root class="w-full">
				<Card.Content class="space-y-2">
					{#if editingId === holiday.id}
						<Label for="holiday-{holiday.id}">Holiday Name</Label>
						<Input bind:value={holiday.name} id="holiday-{holiday.id}" type="text" required />

						<Label for="start-{holiday.id}">Start Date</Label>
						<Input
							value={dateToDatetimeLocal(holiday.start)}
							oninput={(e) => updateHolidayStart(holiday, e.currentTarget.value)}
							id="start-{holiday.id}"
							type="datetime-local"
							required
						/>

						<Label for="end-{holiday.id}">End Date</Label>
						<Input
							value={dateToDatetimeLocal(holiday.end)}
							oninput={(e) => updateHolidayEnd(holiday, e.currentTarget.value)}
							id="end-{holiday.id}"
							type="datetime-local"
							required
						/>
					{:else}
						<div class="flex flex-col space-y-1.5">
							<span class="text-lg font-bold">{holiday.name}</span>
							<span>
								Start: {holiday.start.getDay()}-{holiday.start.getMonth()}-{holiday.start.getFullYear()}
							</span>
							<span>
								End: {holiday.end.getDate()}-{holiday.end.getMonth()}-{holiday.end.getFullYear()}
							</span>
						</div>
					{/if}
					<div class="flex w-full justify-between">
						<Button onclick={() => deleteItem(holiday)} variant="destructive"
							><Trash />Delete</Button
						>
						{#if editingId !== holiday.id}
							<Button onclick={() => startEdit(holiday)}><Pencil />Edit</Button>
						{:else}
							<Button onclick={() => saveEdit()}><Save />Save</Button>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
		{#if holidays.length === 0}
			<div class="flex flex-col items-center justify-center">
				<PlaneTakeoff class="h-30 w-30 py-5" />
				<span class="font-light text-muted-foreground">You have no holidays planned...</span>
			</div>
		{/if}
	</div>

	<div class="mt-auto flex justify-between gap-4">
		<Button onclick={handlePrevious} variant="outline">Previous</Button>
		<Progress value={60} class="mt-3" />
		<Button onclick={handleNext}>Next</Button>
	</div>
</div>
