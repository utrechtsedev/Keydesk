<script>
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { authClient } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils.js';
	let { ref = $bindable(null), class: className, ...restProps } = $props();

	let email = $state('');
	let password = $state('');
	let rememberMe = $state(false);

	async function loginUsingEmail() {
		if (password.length < 8) return toast.error('Controleer je wachtwoord en probeer het opniew.');

		await authClient.signIn.email(
			{
				email,
				password,
				rememberMe,
				callbackURL: '/dashboard'
			},
			{
				onSuccess: () => {
					goto('/dashboard');
				},
				onError: (context) => {
					if (context.error.status === 403) {
						toast.warning('Please confirm your email address before logging in.');
						return;
					}
					toast.error('Unknown email or password.');
				}
			}
		);
	}

	async function resetPassword() {
		if (!email) return toast.error('Enter your email to reset your password.');

		await authClient.signIn.magicLink(
			{
				email,
				callbackURL: '/'
			},
			{
				onSuccess: () => {
					toast.info('If this email is known to us, you will receive an email.');
				},
				onError: () => {
					toast.error('Please check your email and try again.');
				}
			}
		);
	}
</script>

<form class={cn('flex flex-col gap-6', className)} bind:this={ref} {...restProps}>
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Login to continue</h1>
		<p class="text-sm text-balance text-muted-foreground">Please enter your email to log in</p>
	</div>
	<div class="grid gap-6">
		<div class="grid gap-3">
			<Label for="email">Email</Label>
			<Input id="email" type="email" placeholder="m@example.com" required bind:value={email} />
		</div>
		<div class="grid gap-3">
			<div class="flex items-center">
				<Label for="password">Wachtwoord</Label>
				<button
					type="button"
					class="ml-auto text-sm underline-offset-4 hover:underline"
					onclick={resetPassword}
				>
					Forgot Password?
				</button>
			</div>
			<Input id="password" type="password" required bind:value={password} />
		</div>
		<Button type="submit" class="w-full" onclick={loginUsingEmail}>Login</Button>
	</div>
</form>
