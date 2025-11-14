<script lang="ts">
	const { title, body }: { title: string; body: string } = $props();
</script>

<span class="font-bold">{title}</span>

<p>{body}</p>
