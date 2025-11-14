<script lang="ts">
	import TicketTablePage from '$lib/components/tickets/table/ticket-table-page.svelte';
	import type { TicketPageData } from '$lib/types';

	const { data }: { data: TicketPageData } = $props();
</script>

<TicketTablePage {data} />
