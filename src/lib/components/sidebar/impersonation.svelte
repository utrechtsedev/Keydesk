<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { User } from '$lib/types';

	const { user }: { user: User } = $props();

	async function stopImpersonation() {
		await authClient.admin.stopImpersonating();
		window.location.href = '/dashboard/settings/users';
	}
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Impersonation</Sidebar.GroupLabel>
	<Sidebar.Menu>
		<Sidebar.MenuButton
			size="lg"
			class="rounded-0 group-data-[collapsible=icon]:hidden data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
			onclick={stopImpersonation}
		>
			<div
				class="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground"
			>
				<Avatar.Root class="size-8 rounded-lg">
					<Avatar.Image src={user.image} alt={user.name} />
					<Avatar.Fallback>
						{user.name
							.split(' ')
							.map((n: string) => n[0])
							.join('')
							.toUpperCase()}
					</Avatar.Fallback>
				</Avatar.Root>
			</div>
			<div class="grid flex-1 text-left text-sm leading-tight">
				<span class="truncate font-medium">{user.name}</span>
				<span class="truncate text-xs">Click to stop impersonating</span>
			</div>
		</Sidebar.MenuButton>
	</Sidebar.Menu>
</Sidebar.Group>
