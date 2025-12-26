<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavProjects from './nav-projects.svelte';
	import NavUser from './nav-user.svelte';
	import TeamSwitcher from './team-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { ChartPieIcon, FrameIcon, MapIcon } from '@lucide/svelte';
	import Office3 from '$lib/icons/office-3.svelte';
	import Impersonation from './impersonation.svelte';
	import type { Session, User } from '$lib/types';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		user,
		session,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { user: User; session: Session } = $props();

	const data = {
		user: {
			name: 'shadcn',
			email: 'm@example.com',
			avatar: '/avatars/shadcn.jpg'
		},
		teams: [
			{
				name: 'Acme Inc',
				logo: Office3,
				plan: 'Enterprise'
			}
		],

		projects: [
			{
				name: 'Design Engineering',
				url: '#',
				icon: FrameIcon
			},
			{
				name: 'Sales & Marketing',
				url: '#',
				icon: ChartPieIcon
			},
			{
				name: 'Travel',
				url: '#',
				icon: MapIcon
			}
		]
	};
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<TeamSwitcher teams={data.teams} />
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain {user} />
		{#if session?.impersonatedBy}
			<Impersonation {user} />
		{/if}
		<NavProjects projects={data.projects} />
	</Sidebar.Content>

	<Sidebar.Footer>
		<NavUser {user} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
