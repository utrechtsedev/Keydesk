<script lang="ts">
	import type { EmailOrganization } from '../compose.js';
	import Layout from './Layout.svelte';

	let {
		organization,
		preview,
		html,
		ticketReference
	}: {
		organization: EmailOrganization;
		preview: string;
		/** The reply as stored: escaped text or sanitized HTML */
		html: string;
		/** The ticket number with its prefix, such as TKT-42 */
		ticketReference: string;
	} = $props();
</script>

<Layout
	{preview}
	{organization}
	footer="Reply to this email to answer; keep {ticketReference} in the subject."
>
	<tr>
		<td
			style="padding: 32px 40px; font-size: 15px; line-height: 1.6; color: #334155;"
			class="mobile-padding"
		>
			<!-- The message was escaped or sanitized when it was saved, as the dashboard shows it -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html html}
		</td>
	</tr>
</Layout>
