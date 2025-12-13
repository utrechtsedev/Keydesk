<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageData } from '$lib/types';
	import api from '$lib/utils/axios';
	import { toast } from 'svelte-sonner';

	const { data }: { data: PageData } = $props();

	let user = $state(data.user);

	async function handleSave() {
		const response = await api.patch('/api/preferences', { user });
		toast.success('Succesfully updated preferences.');
		user = response.data.user;
	}
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
								disabled
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
								(user.notificationPreferences.dashboard.ticketCreated =
									!user.notificationPreferences.dashboard.ticketCreated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.dashboard.ticketCreated =
										!user.notificationPreferences.dashboard.ticketCreated;
								}
							}}
						>
							<Checkbox
								id="new-ticket-dashboard"
								name="new-ticket-dashboard"
								bind:checked={user.notificationPreferences.dashboard.ticketCreated}
								onclick={() =>
									(user.notificationPreferences.dashboard.ticketCreated =
										!user.notificationPreferences.dashboard.ticketCreated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.dashboard.ticketCreated =
											!user.notificationPreferences.dashboard.ticketCreated;
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
								(user.notificationPreferences.dashboard.itemAssigned =
									!user.notificationPreferences.dashboard.itemAssigned)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.dashboard.itemAssigned =
										!user.notificationPreferences.dashboard.itemAssigned;
								}
							}}
						>
							<Checkbox
								id="item-assigned-dashboard"
								name="item-assigned-dashboard"
								bind:checked={user.notificationPreferences.dashboard.itemAssigned}
								onclick={() =>
									(user.notificationPreferences.dashboard.itemAssigned =
										!user.notificationPreferences.dashboard.itemAssigned)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.dashboard.itemAssigned =
											!user.notificationPreferences.dashboard.itemAssigned;
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
								(user.notificationPreferences.dashboard.itemUpdated =
									!user.notificationPreferences.dashboard.itemUpdated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.dashboard.itemUpdated =
										!user.notificationPreferences.dashboard.itemUpdated;
								}
							}}
						>
							<Checkbox
								id="item-updated-dashboard"
								name="item-updated-dashboard"
								bind:checked={user.notificationPreferences.dashboard.itemUpdated}
								onclick={() =>
									(user.notificationPreferences.dashboard.itemUpdated =
										!user.notificationPreferences.dashboard.itemUpdated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.dashboard.itemUpdated =
											!user.notificationPreferences.dashboard.itemUpdated;
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
								(user.notificationPreferences.dashboard.itemClosed =
									!user.notificationPreferences.dashboard.itemClosed)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.dashboard.itemClosed =
										!user.notificationPreferences.dashboard.itemClosed;
								}
							}}
						>
							<Checkbox
								id="item-closed-dashboard"
								name="item-closed-dashboard"
								bind:checked={user.notificationPreferences.dashboard.itemClosed}
								onclick={() =>
									(user.notificationPreferences.dashboard.itemClosed =
										!user.notificationPreferences.dashboard.itemClosed)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.dashboard.itemClosed =
											!user.notificationPreferences.dashboard.itemClosed;
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
								(user.notificationPreferences.email.ticketCreated =
									!user.notificationPreferences.email.ticketCreated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.email.ticketCreated =
										!user.notificationPreferences.email.ticketCreated;
								}
							}}
						>
							<Checkbox
								id="new-ticket-email"
								name="new-ticket-email"
								bind:checked={user.notificationPreferences.email.ticketCreated}
								onclick={() =>
									(user.notificationPreferences.email.ticketCreated =
										!user.notificationPreferences.email.ticketCreated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.email.ticketCreated =
											!user.notificationPreferences.email.ticketCreated;
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
								(user.notificationPreferences.email.itemAssigned =
									!user.notificationPreferences.email.itemAssigned)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.email.itemAssigned =
										!user.notificationPreferences.email.itemAssigned;
								}
							}}
						>
							<Checkbox
								id="item-assigned-email"
								name="item-assigned-email"
								bind:checked={user.notificationPreferences.email.itemAssigned}
								onclick={() =>
									(user.notificationPreferences.email.itemAssigned =
										!user.notificationPreferences.email.itemAssigned)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.email.itemAssigned =
											!user.notificationPreferences.email.itemAssigned;
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
								(user.notificationPreferences.email.itemUpdated =
									!user.notificationPreferences.email.itemUpdated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.email.itemUpdated =
										!user.notificationPreferences.email.itemUpdated;
								}
							}}
						>
							<Checkbox
								id="item-updated-email"
								name="item-updated-email"
								bind:checked={user.notificationPreferences.email.itemUpdated}
								onclick={() =>
									(user.notificationPreferences.email.itemUpdated =
										!user.notificationPreferences.email.itemUpdated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.email.itemUpdated =
											!user.notificationPreferences.email.itemUpdated;
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
								(user.notificationPreferences.email.itemClosed =
									!user.notificationPreferences.email.itemClosed)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									user.notificationPreferences.email.itemClosed =
										!user.notificationPreferences.email.itemClosed;
								}
							}}
						>
							<Checkbox
								id="item-closed-email"
								name="item-closed-email"
								bind:checked={user.notificationPreferences.email.itemClosed}
								onclick={() =>
									(user.notificationPreferences.email.itemClosed =
										!user.notificationPreferences.email.itemClosed)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										user.notificationPreferences.email.itemClosed =
											!user.notificationPreferences.email.itemClosed;
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
			<Button type="submit" class="whitespace-nowrap" onclick={handleSave}>Save settings</Button>
		</div>
	</form>
</div>
