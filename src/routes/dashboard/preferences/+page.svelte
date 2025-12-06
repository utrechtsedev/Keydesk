<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import type { Notification, NotificationPreferences, User } from '$lib/types';

	const { data }: { data: { user: User; notifications: Notification } } = $props();

	let user = $state(data.user);

	let notificationPreferences = $state<NotificationPreferences>({
		dashboard: {
			ticketCreated: true,
			itemAssigned: true,
			itemUpdated: true,
			itemClosed: true
		},
		email: {
			ticketCreated: false,
			itemAssigned: true,
			itemUpdated: false,
			itemClosed: true
		}
	});
</script>

<div class="flex items-center justify-center p-10">
	<form>
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Personal information</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Lorem ipsum dolor sit amet, consetetur sadipscing elitr.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Name</Field.Label>
							<Input
								type="text"
								id="first-name"
								name="first-name"
								placeholder="Emma"
								value={user.name}
							/>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Email</Field.Label>
							<Input
								type="email"
								id="email"
								name="email"
								placeholder="emma@company.com"
								value={user.email}
							/>
						</Field.Set>
					</div>
					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Role</Field.Label>
							<Input type="text" id="role" name="role" placeholder={user.role} disabled />
							<Field.Description>Roles can only be changed by system admin.</Field.Description>
						</Field.Set>
					</div>
				</div>
			</div>
		</div>
		<Separator class="my-8" />
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<h2 class="font-semibold text-foreground dark:text-foreground">Notification settings</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
					Lorem ipsum dolor sit amet, consetetur sadipscing elitr.
				</p>
			</div>
			<div class="sm:max-w-3xl md:col-span-2">
				<Field.Set>
					<legend class="text-sm font-medium text-foreground dark:text-foreground">
						Dashboard
					</legend>
					<Field.Description class="mt-1 leading-6">
						Configure the types of dashboard alerts you want to receive. Send me a dashboard alert
						when:
					</Field.Description>
					<div class="mt-2">
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.dashboard.ticketCreated =
									!notificationPreferences.dashboard.ticketCreated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.dashboard.ticketCreated =
										!notificationPreferences.dashboard.ticketCreated;
								}
							}}
						>
							<Checkbox
								id="new-ticket-dashboard"
								name="new-ticket-dashboard"
								bind:checked={notificationPreferences.dashboard.ticketCreated}
								onclick={() =>
									(notificationPreferences.dashboard.ticketCreated =
										!notificationPreferences.dashboard.ticketCreated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.dashboard.ticketCreated =
											!notificationPreferences.dashboard.ticketCreated;
									}
								}}
							/>
							<Field.Label class="font-normal">A new ticket is created</Field.Label>
						</div>
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.dashboard.itemAssigned =
									!notificationPreferences.dashboard.itemAssigned)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.dashboard.itemAssigned =
										!notificationPreferences.dashboard.itemAssigned;
								}
							}}
						>
							<Checkbox
								id="item-assigned-dashboard"
								name="item-assigned-dashboard"
								bind:checked={notificationPreferences.dashboard.itemAssigned}
								onclick={() =>
									(notificationPreferences.dashboard.itemAssigned =
										!notificationPreferences.dashboard.itemAssigned)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.dashboard.itemAssigned =
											!notificationPreferences.dashboard.itemAssigned;
									}
								}}
							/>
							<Field.Label class="font-normal">A ticket or task is assigned to me</Field.Label>
						</div>
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.dashboard.itemUpdated =
									!notificationPreferences.dashboard.itemUpdated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.dashboard.itemUpdated =
										!notificationPreferences.dashboard.itemUpdated;
								}
							}}
						>
							<Checkbox
								id="item-updated-dashboard"
								name="item-updated-dashboard"
								bind:checked={notificationPreferences.dashboard.itemUpdated}
								onclick={() =>
									(notificationPreferences.dashboard.itemUpdated =
										!notificationPreferences.dashboard.itemUpdated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.dashboard.itemUpdated =
											!notificationPreferences.dashboard.itemUpdated;
									}
								}}
							/>
							<Field.Label class="font-normal">My ticket or task is updated</Field.Label>
						</div>
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.dashboard.itemClosed =
									!notificationPreferences.dashboard.itemClosed)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.dashboard.itemClosed =
										!notificationPreferences.dashboard.itemClosed;
								}
							}}
						>
							<Checkbox
								id="item-closed-dashboard"
								name="item-closed-dashboard"
								bind:checked={notificationPreferences.dashboard.itemClosed}
								onclick={() =>
									(notificationPreferences.dashboard.itemClosed =
										!notificationPreferences.dashboard.itemClosed)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.dashboard.itemClosed =
											!notificationPreferences.dashboard.itemClosed;
									}
								}}
							/>
							<Field.Label class="font-normal">
								My ticket or task has been closed or resolved by another agent
							</Field.Label>
						</div>
					</div>
				</Field.Set>
				<Field.Set class="mt-6">
					<legend class="text-sm font-medium text-foreground dark:text-foreground"> Email </legend>
					<Field.Description class="mt-1 leading-6">
						Configure the types of email alerts you want to receive. Send me an email notification
						when:
					</Field.Description>
					<div class="mt-2">
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.email.ticketCreated =
									!notificationPreferences.email.ticketCreated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.email.ticketCreated =
										!notificationPreferences.email.ticketCreated;
								}
							}}
						>
							<Checkbox
								id="new-ticket-email"
								name="new-ticket-email"
								bind:checked={notificationPreferences.email.ticketCreated}
								onclick={() =>
									(notificationPreferences.email.ticketCreated =
										!notificationPreferences.email.ticketCreated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.email.ticketCreated =
											!notificationPreferences.email.ticketCreated;
									}
								}}
							/>
							<Field.Label class="font-normal">A new ticket is created</Field.Label>
						</div>
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.email.itemAssigned =
									!notificationPreferences.email.itemAssigned)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.email.itemAssigned =
										!notificationPreferences.email.itemAssigned;
								}
							}}
						>
							<Checkbox
								id="item-assigned-email"
								name="item-assigned-email"
								bind:checked={notificationPreferences.email.itemAssigned}
								onclick={() =>
									(notificationPreferences.email.itemAssigned =
										!notificationPreferences.email.itemAssigned)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.email.itemAssigned =
											!notificationPreferences.email.itemAssigned;
									}
								}}
							/>
							<Field.Label class="font-normal">A ticket or task is assigned to me</Field.Label>
						</div>
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.email.itemUpdated =
									!notificationPreferences.email.itemUpdated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.email.itemUpdated =
										!notificationPreferences.email.itemUpdated;
								}
							}}
						>
							<Checkbox
								id="item-updated-email"
								name="item-updated-email"
								bind:checked={notificationPreferences.email.itemUpdated}
								onclick={() =>
									(notificationPreferences.email.itemUpdated =
										!notificationPreferences.email.itemUpdated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.email.itemUpdated =
											!notificationPreferences.email.itemUpdated;
									}
								}}
							/>
							<Field.Label class="font-normal">My ticket or task is updated</Field.Label>
						</div>
						<div
							class="flex items-center gap-x-3 py-1"
							role="button"
							tabindex="0"
							onclick={() =>
								(notificationPreferences.email.itemClosed =
									!notificationPreferences.email.itemClosed)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									notificationPreferences.email.itemClosed =
										!notificationPreferences.email.itemClosed;
								}
							}}
						>
							<Checkbox
								id="item-closed-email"
								name="item-closed-email"
								bind:checked={notificationPreferences.email.itemClosed}
								onclick={() =>
									(notificationPreferences.email.itemClosed =
										!notificationPreferences.email.itemClosed)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										notificationPreferences.email.itemClosed =
											!notificationPreferences.email.itemClosed;
									}
								}}
							/>
							<Field.Label class="font-normal">
								My ticket or task has been closed or resolved by another agent
							</Field.Label>
						</div>
					</div></Field.Set
				>
			</div>
		</div>
		<Separator class="my-8" />
		<div class="flex items-center justify-end space-x-4">
			<Button type="button" variant="outline" class="whitespace-nowrap">Go back</Button>
			<Button type="submit" class="whitespace-nowrap">Save settings</Button>
		</div>
	</form>
</div>
