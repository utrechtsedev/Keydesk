<script lang="ts">
	import { enhance } from '$app/forms';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
</script>

{#if data.invitation}
	<form
		method="POST"
		class="flex flex-col gap-6"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<div class="flex flex-col items-center gap-2 text-center">
			<h1 class="text-2xl font-bold">Join {data.invitation.organizationName}</h1>
			<p class="text-sm text-balance text-muted-foreground">
				Choose a password to sign in as {data.invitation.name}.
			</p>
		</div>
		<div class="grid gap-6">
			<div class="grid gap-3">
				<Label for="email">Email</Label>
				<Input id="email" type="email" value={data.invitation.email} readonly />
			</div>
			<div class="grid gap-3">
				<Label for="password">Password</Label>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="new-password"
					minlength={8}
					maxlength={128}
					required
				/>
			</div>
			<div class="grid gap-3">
				<Label for="confirmation">Repeat password</Label>
				<Input
					id="confirmation"
					name="confirmation"
					type="password"
					autocomplete="new-password"
					required
				/>
			</div>
			{#if form?.message}
				<p class="text-sm text-destructive" role="alert">{form.message}</p>
			{/if}
			<Button type="submit" class="w-full" disabled={submitting}>Set password</Button>
		</div>
	</form>
{:else}
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Invitation not valid</h1>
		<p class="text-sm text-balance text-muted-foreground">
			This invitation has expired or has already been used. Ask an admin of your organization for a
			new one.
		</p>
		<a href="/login" class="text-sm underline underline-offset-4">Go to login</a>
	</div>
{/if}
