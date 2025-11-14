<script>
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { usePasswordStrength } from '$lib/hooks/use-password-strength.svelte';
	import { Check, Eye, EyeOff, X } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import axios from 'axios';

	const passwordStrength = usePasswordStrength({ id: 'password' });

	let email = $state('');
	let name = $state('');

	async function registerUsingEmail() {
		if (!name) return toast.error('Please enter a name to continue.');
		if (!email) return toast.error('Please enter an email address to continue.');
		if (passwordStrength.password.length < 8)
			return toast.error('Please check the strength of your password and try again');

		const response = await axios.post('', {
			user: {
				name,
				email,
				password: passwordStrength.password
			}
		});

		if (response.status > 299) return toast.error('Internal error. Please try again.');

		toast.success('Welcome to Ticketing. Please login.');
		goto('/login');
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between px-4 pb-3">
		<div>
			<h1 class="text-2xl font-bold">Create your account</h1>
			<p class="text-sm text-muted-foreground">Create an administrator account</p>
		</div>
		<Button onclick={registerUsingEmail}>Finish and continue</Button>
	</div>

	<div class="grid">
		<div class="flex justify-between border-y px-4 py-3">
			<Label for="name" class="text-md">Name</Label>
			<Input
				id="name"
				type="text"
				placeholder="Jan Koskamp"
				required
				bind:value={name}
				class="w-[40%]"
			/>
		</div>

		<div class="grid">
			<div class="flex justify-between border-b px-4 py-3">
				<Label for="email" class="text-md">Email</Label>
				<Input
					id="email"
					type="email"
					placeholder="m@example.com"
					required
					bind:value={email}
					class="w-[40%]"
				/>
			</div>
			<div class="flex items-start justify-between px-4 py-3">
				<Label for="password" class="text-md">Password</Label>
				<div class="w-[40%]">
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

					<p id="password-strength" class="mb-2 text-sm font-medium text-foreground">
						{passwordStrength.strengthText}. Requirements:
					</p>

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
		</div>
	</div>
</div>
