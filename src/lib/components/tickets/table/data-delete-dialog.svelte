<script lang="ts">
	import { invalidate } from '$app/navigation';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import api from '$lib/utils/axios';
	import { toast } from 'svelte-sonner';

	let { open = $bindable(), ids }: { open: boolean; ids: number[] } = $props();

	async function handleDelete() {
		await api.delete('/api/tickets/bulk', {
			data: {
				ids
			}
		});
		invalidate('app:tickets');
		open = false;
		return toast.success('Succesfully deleted ticket(s).');
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
			<AlertDialog.Description>
				This action cannot be undone. This will permanently delete {ids.length} ticket(s).
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleDelete}>Continue</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
