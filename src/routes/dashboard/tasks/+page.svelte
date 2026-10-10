<script lang="ts">
	import TaskTablePage from '#lib/components/tasks/task-table-page.svelte';
	import type { TaskPageData } from '#lib/types/index.js';

	const { data }: { data: TaskPageData } = $props();
</script>

<TaskTablePage {data} />
