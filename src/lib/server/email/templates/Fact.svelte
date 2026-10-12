<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children: Snippet } = $props();
</script>

<td style="padding-right: 24px;">
	<p
		style="margin: 0; font-size: 12px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;"
	>
		{label}
	</p>
	<p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">
		{@render children()}
	</p>
</td>
