<script>
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { usePasswordStrength } from '$lib/hooks/use-password-strength.svelte';
	import { Check, Eye, EyeOff, X } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	const passwordStrength = usePasswordStrength({ id: 'password' });
	let { ref = $bindable(null), class: className, ...restProps } = $props();

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

<form class={cn('flex flex-col gap-6', className)} bind:this={ref} {...restProps}>
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Maak een account aan</h1>
		<p class="text-sm text-balance text-muted-foreground">
			Vul je email hieronder in om verder te gaan
		</p>
	</div>
	<div class="grid gap-6">
		<div class="grid gap-3">
			<Label for="name">Naam</Label>
			<Input id="name" type="text" placeholder="Jan Koskamp" required bind:value={name} />
		</div>

		<div class="grid gap-6">
			<div class="grid gap-3">
				<Label for="email">Email</Label>
				<Input id="email" type="email" placeholder="m@example.com" required bind:value={email} />
			</div>
			<div class="grid gap-3">
				<div class="flex items-center">
					<Label for="password">Wachtwoord</Label>
				</div>

				<script lang="ts">
				</script>

				<div>
					<!-- Password input field with toggle visibility button -->
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
									<EyeOff size={16} aria-hidden="true" />
								{:else}
									<Eye size={16} aria-hidden="true" />
								{/if}
							</button>
						</div>
					</div>

					<!-- Password strength indicator -->
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
								`h-full transition-all duration-500 ease-out`,
								passwordStrength.strengthColor
							)}
							style:width="{(passwordStrength.strengthScore / 4) * 100}%"
						></div>
					</div>

					<!-- Password strength description -->
					<p id="password-strength" class="mb-2 text-sm font-medium text-foreground">
						{passwordStrength.strengthText}. Requirements:
					</p>

					<!-- Password requirements list -->
					<ul class="space-y-1.5" aria-label="Password requirements">
						{#each passwordStrength.strength as req (req.text)}
							<li class="flex items-center space-x-2">
								{#if req.met}
									<Check size={16} class="text-emerald-500" aria-hidden="true" />
								{:else}
									<X size={16} class="text-muted-foreground/80" aria-hidden="true" />
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
				disabled={passwordStrength.strengthScore != 4 || email === ''}>Aanmelden</Button
			>
			<div
				class="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border"
			>
				<span class="relative z-10 bg-background px-2 text-muted-foreground"> of ga door met </span>
			</div>
			<Button variant="outline" class="w-full">
				<svg
					width="256"
					height="262"
					viewBox="0 0 256 262"
					xmlns="http://www.w3.org/2000/svg"
					preserveAspectRatio="xMidYMid"
					><path
						d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
						fill="#4285F4"
					/><path
						d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
						fill="#34A853"
					/><path
						d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
						fill="#FBBC05"
					/><path
						d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
						fill="#EB4335"
					/></svg
				>
				Aanmelden met Google
			</Button>
		</div>
		<div class="text-center text-sm">
			Al een account?
			<a href="/login" class="underline underline-offset-4"> Inloggen </a>
		</div>
	</div>
</form>
