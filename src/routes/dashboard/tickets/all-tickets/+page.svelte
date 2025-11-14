<script lang="ts">
	import type { TicketPageData } from '$lib/types';
	import TicketTablePage from '$lib/components/tickets/table/ticket-table-page.svelte';

	const { data }: { data: TicketPageData } = $props();
</script>

<TicketTablePage {data} />
