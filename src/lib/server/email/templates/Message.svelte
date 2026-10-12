<script lang="ts">
	import type { EmailOrganization } from '../compose.js';
	import Button from './Button.svelte';
	import Layout from './Layout.svelte';

	let {
		organization,
		title,
		message,
		action,
		footer
	}: {
		organization: EmailOrganization;
		title: string;
		message: string;
		action: { label: string; url: string };
		footer: string;
	} = $props();
</script>

<Layout preview={title} {organization} {footer}>
	<tr>
		<td style="padding: 32px 40px;" class="mobile-padding">
			<div
				style="border-left: 3px solid #e5e7eb; background-color: #fafafa; padding: 20px; border-radius: 4px;"
			>
				<h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #0f172a;">
					{title}
				</h2>
				<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155;">{message}</p>
			</div>
		</td>
	</tr>
	<tr>
		<td style="padding: 0 40px 32px;" class="mobile-padding" align="center">
			<Button label={action.label} url={action.url} />
		</td>
	</tr>
</Layout>
