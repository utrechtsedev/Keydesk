<script lang="ts">
	let { label, url }: { label: string; url: string } = $props();
</script>

<a
	href={url}
	target="_blank"
	style="display: inline-block; padding: 12px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; letter-spacing: 0.01em;"
>
	{label}
</a>
