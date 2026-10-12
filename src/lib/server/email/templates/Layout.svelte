<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { EmailOrganization } from '../compose.js';

	let {
		preview,
		organization,
		subtitle,
		footer,
		children
	}: {
		/** Shown by mail clients next to the subject */
		preview: string;
		organization: EmailOrganization;
		subtitle?: string;
		footer: string;
		children: Snippet;
	} = $props();
</script>

<div
	style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; opacity: 0;"
>
	{preview}
</div>
<table
	role="presentation"
	style="width: 100%; background-color: #f8f9fa;"
	cellpadding="0"
	cellspacing="0"
	border="0"
>
	<tbody>
		<tr>
			<td style="padding: 40px 20px;" align="center">
				<table
					role="presentation"
					style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);"
					cellpadding="0"
					cellspacing="0"
					border="0"
				>
					<tbody>
						<tr>
							<td
								style="padding: 32px 40px; border-bottom: 1px solid #e5e7eb;"
								class="mobile-padding"
							>
								<h1
									style="margin: 0; font-size: 24px; font-weight: 600; color: #0f172a; letter-spacing: -0.025em;"
								>
									{organization.name}
								</h1>
								{#if subtitle}
									<p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">{subtitle}</p>
								{/if}
							</td>
						</tr>

						{@render children()}

						<tr>
							<td
								style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;"
								class="mobile-padding"
							>
								<p style="margin: 0 0 16px; font-size: 13px; color: #64748b; line-height: 1.6;">
									<strong style="color: #0f172a;">{organization.name}</strong><br />
									{organization.address}<br />
									{organization.city}
									{organization.zipCode}
								</p>
								<p
									style="margin: 0; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #94a3b8;"
								>
									{footer}
								</p>
							</td>
						</tr>
					</tbody>
				</table>
			</td>
		</tr>
	</tbody>
</table>
