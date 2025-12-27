<script>
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { usePasswordStrength } from '$lib/hooks/use-password-strength.svelte';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import Check from '$lib/icons/check.svelte';
	import Eye from '$lib/icons/eye.svelte';
	import EyeSlash from '$lib/icons/eye-slash.svelte';
	import Xmark from '$lib/icons/xmark.svelte';

	const passwordStrength = usePasswordStrength({ id: 'password' });

	let email = $state('');
	let name = $state('');

	async function registerUsingEmail() {
		if (!name) return toast.error('Please enter a name to continue.');
		if (!email) return toast.error('Please enter an email address to continue.');
		if (passwordStrength.password.length < 8)
			return toast.error('Please check the strength of your password and try again');

		await authClient.signUp.email({
			email,
			password: passwordStrength.password,
			name,
			callbackURL: '/',
			fetchOptions: {
				onError: () => {
					toast.error('Something went wrong. Please try again.');
				},
				onSuccess: () => {
					toast.info('Please confirm your email address before trying to log in');
					goto('/login');
				}
			}
		});
	}
</script>

<form class="flex flex-col gap-6">
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Create an account</h1>
		<p class="text-sm text-balance text-muted-foreground">Please enter your email to log in</p>
	</div>
	<div class="grid gap-6">
		<div class="grid gap-3">
			<Label for="name">Name</Label>
			<Input id="name" type="text" placeholder="Jan Koskamp" required bind:value={name} />
		</div>

		<div class="grid gap-6">
			<div class="grid gap-3">
				<Label for="email">Email</Label>
				<Input id="email" type="email" placeholder="m@example.com" required bind:value={email} />
			</div>
			<div class="grid gap-3">
				<div class="flex items-center">
					<Label for="password">Password</Label>
				</div>

				<script lang="ts">
				</script>

				<div>
					<div class="*:not-first:mt-2">
						<div class="relative">
							<Input
								id={passwordStrength.id}
								class="pe-9"
								type={passwordStrength.isVisible ? 'text' : 'password'}
								bind:value={passwordStrength.password}
								aria-describedby={passwordStrength.id}
							/>
							<button
								class="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
								type="button"
								onclick={passwordStrength.toggleVisibility}
								aria-label={passwordStrength.isVisible ? 'Hide password' : 'Show password'}
								aria-pressed={passwordStrength.isVisible}
								aria-controls={passwordStrength.id}
							>
								{#if passwordStrength.isVisible}
									<EyeSlash size={16} aria-hidden="true" />
								{:else}
									<Eye size={16} aria-hidden="true" />
								{/if}
							</button>
						</div>
					</div>

					<div
						class="mt-3 mb-4 h-1 w-full overflow-hidden rounded-full bg-border"
						role="progressbar"
						aria-valuenow={passwordStrength.strengthScore}
						aria-valuemin={0}
						aria-valuemax={4}
						aria-label="Password strength"
					>
						<div
							class={cn(
								'h-full transition-all duration-500 ease-out',
								passwordStrength.strengthColor
							)}
							style:width="{(passwordStrength.strengthScore / 4) * 100}%"
						></div>
					</div>

					<p id="password-strength" class="mb-2 text-sm font-medium text-foreground">
						{passwordStrength.strengthText}. Requirements:
					</p>

					<ul class="space-y-1.5" aria-label="Password requirements">
						{#each passwordStrength.strength as req (req.text)}
							<li class="flex items-center space-x-2">
								{#if req.met}
									<Check size={16} class="text-emerald-500" aria-hidden="true" />
								{:else}
									<Xmark size={16} aria-hidden="true" />
								{/if}
								<span class={`text-xs ${req.met ? 'text-emerald-600' : 'text-muted-foreground'}`}>
									{req.text}
									<span class="sr-only">
										{req.met ? ' - Requirement met' : ' - Requirement not met'}
									</span>
								</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
			<Button
				type="submit"
				class="w-full"
				onclick={registerUsingEmail}
				disabled={passwordStrength.strengthScore != 4 || email === ''}>Register</Button
			>
		</div>
	</div>
</form>
