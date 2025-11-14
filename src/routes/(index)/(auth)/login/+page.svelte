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
					toast.error('Foutieve email of wachtwoord.');
				}
			}
		);
	}

	async function resetPassword() {
		if (!email) return toast.error('Vul je email adres in om je wachtwoord te resetten.');

		await authClient.signIn.magicLink(
			{
				email,
				callbackURL: '/'
			},
			{
				onSuccess: () => {
					toast.info(
						'Als je email klopt, hebt een mailtje ontvangen waarmee je je wachtwoord kunt resetten.'
					);
				},
				onError: () => {
					toast.error('Controleer je email en probeer het opnieuw.');
				}
			}
		);
	}
</script>

<form class={cn('flex flex-col gap-6', className)} bind:this={ref} {...restProps}>
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Login in om verder te gaan</h1>
		<p class="text-sm text-balance text-muted-foreground">
			Vul je email hieronder in om in te loggen
		</p>
	</div>
	<div class="grid gap-6">
		<div class="grid gap-3">
			<Label for="email">Email</Label>
			<Input id="email" type="email" placeholder="m@example.com" required bind:value={email} />
		</div>
		<div class="grid gap-3">
			<div class="flex items-center">
				<Label for="password">Wachtwoord</Label>
				<p class="ml-auto text-sm underline-offset-4 hover:underline" onclick={resetPassword}>
					Wachtwoord vergeten?
				</p>
			</div>
			<Input id="password" type="password" required bind:value={password} />
		</div>
		<Button type="submit" class="w-full" onclick={loginUsingEmail}>Login</Button>
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
			Login met Google
		</Button>
	</div>
	<div class="text-center text-sm">
		Nog geen account?
		<a href="/register" class="underline underline-offset-4"> Registreren </a>
	</div>
</form>
