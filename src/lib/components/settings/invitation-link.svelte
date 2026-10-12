<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';

	let { url }: { url: string } = $props();

	async function copy() {
		await navigator.clipboard.writeText(url);
		toast.success('Invitation link copied.');
	}
</script>

<div class="grid gap-3">
	<p class="text-sm text-muted-foreground">
		The invitation email couldn't be sent; check the outgoing email settings. Until then, pass this
		link on yourself.
	</p>
	<div class="flex gap-2">
		<Input
			value={url}
			readonly
			aria-label="Invitation link"
			onfocus={(e) => e.currentTarget.select()}
		/>
		<Button type="button" variant="secondary" onclick={copy}>Copy</Button>
	</div>
</div>
