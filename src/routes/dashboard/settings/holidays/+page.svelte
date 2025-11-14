<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Pencil, PlaneTakeoff, Plus, Save, Trash, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { onMount } from 'svelte';
	import type { Holiday } from '$lib/types';

	type HolidayType = Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>;

	let holidays: HolidayType[] = $state([]);
	let editing = $state<HolidayType>();

	function startEdit(item: HolidayType) {
		editing = item;
	}

	function cancelEdit() {
		editing = undefined;
	}

	function saveEdit() {
		let currentEditing = holidays.find((h) => h === editing);
		if (!currentEditing || currentEditing.name.length < 1)
			return toast.error('Holiday name must be at least 1 character');
		editing = undefined;
	}

	function addItem() {
		const newItem: HolidayType = {
			name: 'New Holiday',
			start: new Date(),
			end: new Date()
		};
		holidays.push(newItem);
		editing = newItem;
	}

	function deleteItem(item: HolidayType) {
		holidays = holidays.filter((h) => h !== item);
		editing = undefined;
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

	function updateHolidayStart(holiday: HolidayType, dateStr: string) {
		holiday.start = datetimeLocalToDate(dateStr);
	}

	function updateHolidayEnd(holiday: HolidayType, dateStr: string) {
		holiday.end = datetimeLocalToDate(dateStr);
	}

	async function handleSave() {
		const response = await axios.post('/api/settings/holidays', { holidays });

		if (response.status < 300) {
			toast.success('Successfully saved holiday settings.');
			return;
		}

		console.log(response.status, response.statusText);
		return toast.error('Error saving configuration. Check browser console.');
	}

	onMount(async () => {
		const { data } = await axios.get('/api/settings/holidays');

		if (data.data)
			holidays = data.data.map((h: HolidayType) => ({
				...h,
				start: new Date(h.start),
				end: new Date(h.end)
			}));
	});
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Holiday Settings</h1>
			<p class="text-sm text-muted-foreground">Set your holidays</p>
		</div>
		<div class="flex items-start gap-2">
			<Button onclick={addItem} variant="secondary">
				<Plus />
				Add Holiday
			</Button>
			<Button onclick={handleSave}>Save</Button>
		</div>
	</div>

	{#if holidays.length === 0}
		<div class="flex flex-col items-center justify-center py-12">
			<PlaneTakeoff class="h-16 w-16 text-muted-foreground" />
			<span class="mt-4 font-light text-muted-foreground">You have no holidays planned...</span>
		</div>
	{:else}
		<div class="grid">
			{#each holidays as holiday, index}
				{@const isFirst = index === 0}
				{@const isEditing = editing === holiday}

				{#if isEditing}
					<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
						<Label for="holiday-name-{holiday}" class="text-md">Holiday Name</Label>
						<Input
							bind:value={holiday.name}
							id="holiday-name-{holiday.name}"
							type="text"
							required
							class="w-[40%]"
						/>
					</div>
					<div class="flex justify-between border-b px-4 py-3">
						<Label for="start-{holiday.name}" class="text-md">Start Date</Label>
						<Input
							value={dateToDatetimeLocal(holiday.start)}
							oninput={(e) => updateHolidayStart(holiday, e.currentTarget.value)}
							id="start-{holiday.name}"
							type="datetime-local"
							required
							class="w-[40%]"
						/>
					</div>
					<div class="flex justify-between border-b px-4 py-3">
						<Label for="end-{holiday.name}" class="text-md">End Date</Label>
						<Input
							value={dateToDatetimeLocal(holiday.end)}
							oninput={(e) => updateHolidayEnd(holiday, e.currentTarget.value)}
							id="end-{holiday.name}"
							type="datetime-local"
							required
							class="w-[40%]"
						/>
					</div>
					<div class="flex justify-between border-b bg-muted/30 px-4 py-3">
						<div class="flex gap-2">
							<Button onclick={() => deleteItem(holiday)} variant="destructive" size="sm">
								<Trash class="h-4 w-4" />
								Delete
							</Button>
						</div>
						<div class="flex gap-2">
							<Button onclick={cancelEdit} variant="outline" size="sm">
								<X class="h-4 w-4" />
								Cancel
							</Button>
							<Button onclick={saveEdit} size="sm">
								<Save class="h-4 w-4" />
								Save
							</Button>
						</div>
					</div>
				{:else}
					<div class="flex justify-between {isFirst ? 'border-y' : 'border-b'} px-4 py-3">
						<div class="flex flex-col gap-1">
							<span class="text-md font-semibold">{holiday.name}</span>
							<span class="text-sm text-muted-foreground">
								{holiday.start.toLocaleDateString()} - {holiday.end.toLocaleDateString()}
							</span>
						</div>
						<div class="flex gap-2">
							<Button onclick={() => deleteItem(holiday)} variant="destructive" size="sm">
								<Trash class="h-4 w-4" />
							</Button>
							<Button onclick={() => startEdit(holiday)} variant="secondary" size="sm">
								<Pencil class="h-4 w-4" />
								Edit
							</Button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
