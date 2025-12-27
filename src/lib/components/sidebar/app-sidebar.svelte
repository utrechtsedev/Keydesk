<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavProjects from './nav-projects.svelte';
	import NavUser from './nav-user.svelte';
	import TeamSwitcher from './team-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import Office3 from '$lib/icons/office-3.svelte';
	import Impersonation from './impersonation.svelte';
	import type { Organization, Session, User } from '$lib/types';
	import ChartPie from '$lib/icons/chart-pie.svelte';
	import Hashtag from '$lib/icons/hashtag.svelte';
	import Map from '$lib/icons/map.svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		user,
		session,
		organization,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		user: User;
		session: Session;
		organization: Organization;
	} = $props();

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
				icon: Hashtag
			},
			{
				name: 'Sales & Marketing',
				url: '#',
				icon: ChartPie
			},
			{
				name: 'Travel',
				url: '#',
				icon: Map
			}
		]
	};
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<TeamSwitcher {organization} />
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
