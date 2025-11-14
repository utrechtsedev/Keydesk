<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DataTable from '$lib/components/tickets/table/data-table.svelte';
	import { columns } from '$lib/components/tickets/table/columns.js';
	import type { TicketPageData } from '$lib/types';
	import { onMount } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import Refresh from '$lib/icons/refresh.svelte';

	let {
		data = $bindable()
	}: {
		data: TicketPageData;
	} = $props();

	let autoRefresh = $state(true);

	onMount(() => {
		const savedAutoRefresh = localStorage.getItem('autoRefresh');
		if (savedAutoRefresh !== null) {
			autoRefresh = JSON.parse(savedAutoRefresh);
		}
		if (autoRefresh) {
			const interval = setInterval(() => {
				if (autoRefresh) invalidate('app:tickets');
			}, 20000);
			return () => clearInterval(interval);
		}
	});
</script>

<div class="flex items-end justify-between">
	<span class="text-2xl font-extrabold">Tickets</span>
	<div class="flex space-x-3">
		<Button size="sm" onclick={() => goto('/dashboard/tickets/new-ticket')}>New Ticket</Button>
		<div class="flex items-center">
			<Button
				variant="outline"
				size="sm"
				class="m-0 rounded-r-none border-r-0"
				onclick={() => invalidate('app:tickets')}
			>
				<Refresh class="" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				class="m-0 rounded-l-none {autoRefresh ? '!bg-muted' : ''}"
				onclick={() => {
					autoRefresh = !autoRefresh;
					localStorage.setItem('autoRefresh', JSON.stringify(autoRefresh));
				}}>Auto Refresh</Button
			>
		</div>
	</div>
</div>
<DataTable
	data={data.tickets}
	{columns}
	pageCount={data.pageCount}
	totalCount={data.totalCount}
	categories={data.categories}
	priorities={data.priorities}
	statuses={data.statuses}
	tags={data.tags}
	users={data.users}
/>
