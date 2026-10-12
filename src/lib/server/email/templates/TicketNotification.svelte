<script lang="ts">
	import type { EmailOrganization } from '../compose.js';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Fact from './Fact.svelte';
	import Layout from './Layout.svelte';

	let {
		organization,
		title,
		message,
		actionUrl,
		ticket
	}: {
		organization: EmailOrganization;
		title: string;
		message: string;
		actionUrl: string;
		ticket: { number: string; subject: string; status: string; createdAt: string };
	} = $props();
</script>

<Layout
	preview={title}
	{organization}
	footer="You're receiving this email because you're involved with this ticket."
>
	<tr>
		<td style="padding: 24px 40px 0;" class="mobile-padding">
			<table
				role="presentation"
				style="border-radius: 6px; padding: 12px 16px;"
				cellpadding="0"
				cellspacing="0"
				border="0"
			>
				<tbody>
					<tr>
						<Fact label="Ticket">{ticket.number}</Fact>
						<Fact label="Status"><Badge text={ticket.status} /></Fact>
					</tr>
				</tbody>
			</table>
		</td>
	</tr>
	<tr>
		<td style="padding: 24px 40px 8px;" class="mobile-padding">
			<h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #0f172a; line-height: 1.4;">
				{ticket.subject}
			</h2>
		</td>
	</tr>
	<tr>
		<td style="padding: 16px 40px;" class="mobile-padding">
			<div
				style="border-left: 3px solid #e5e7eb; background-color: #fafafa; padding: 16px 20px; border-radius: 4px;"
			>
				<p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #0f172a;">{title}</p>
				<p style="margin: 0 0 16px; font-size: 12px; color: #64748b;">{ticket.createdAt}</p>
				<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155;">{message}</p>
			</div>
		</td>
	</tr>
	<tr>
		<td style="padding: 24px 40px;" class="mobile-padding" align="center">
			<Button label="View Ticket" url={actionUrl} />
		</td>
	</tr>
	<tr>
		<td style="padding: 0 40px 32px;" class="mobile-padding">
			<p style="margin: 0; font-size: 13px; color: #64748b; text-align: center; line-height: 1.5;">
				You can reply directly to this email to continue the conversation
			</p>
		</td>
	</tr>
</Layout>
