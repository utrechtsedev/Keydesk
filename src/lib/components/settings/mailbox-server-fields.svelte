<script lang="ts" module>
	/** A mail server as the mailbox form edits it; an empty password keeps the stored one */
	export interface ServerFields {
		host: string;
		port: number;
		secure: boolean;
		username: string;
		password: string;
	}
</script>

<script lang="ts">
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';

	let {
		label,
		id,
		server = $bindable(),
		hasPassword
	}: { label: string; id: string; server: ServerFields; hasPassword: boolean } = $props();
</script>

<Field.Set class="gap-3">
	<Field.Legend>{label}</Field.Legend>
	<div class="grid grid-cols-6 gap-3">
		<div class="col-span-4 grid gap-2">
			<Field.Label for="{id}-host">Host</Field.Label>
			<Input id="{id}-host" bind:value={server.host} required />
		</div>
		<div class="col-span-2 grid gap-2">
			<Field.Label for="{id}-port">Port</Field.Label>
			<Input id="{id}-port" type="number" min={1} max={65535} bind:value={server.port} required />
		</div>
		<div class="col-span-3 grid gap-2">
			<Field.Label for="{id}-username">User name</Field.Label>
			<Input id="{id}-username" bind:value={server.username} autocomplete="off" required />
		</div>
		<div class="col-span-3 grid gap-2">
			<Field.Label for="{id}-password">Password</Field.Label>
			<Input
				id="{id}-password"
				type="password"
				bind:value={server.password}
				autocomplete="new-password"
				placeholder={hasPassword ? 'Unchanged' : ''}
				required={!hasPassword}
			/>
		</div>
		<div class="col-span-6 flex items-center gap-2">
			<Switch id="{id}-secure" bind:checked={server.secure} />
			<Field.Label for="{id}-secure" class="font-normal">Encrypted connection (TLS)</Field.Label>
		</div>
	</div>
</Field.Set>
