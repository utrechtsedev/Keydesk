<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageData, User } from '$lib/types';
	import api from '$lib/utils/axios';
	import { goto, invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData & { targetUser: User } } = $props();

	// svelte-ignore state_referenced_locally
	let targetUser = $state(data.targetUser);

	async function handleSave() {
		await api.patch(`/api/settings/users/${data.user.id}`, { user: targetUser });
		invalidate('app:user');

		toast.success(`Succesfully updated ${data.user.name}`);
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
								value={targetUser.name}
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
								value={targetUser.email}
							/>
						</Field.Set>
					</div>

					<div class="col-span-full sm:col-span-3">
						<Field.Set class="gap-2">
							<Field.Label>Role</Field.Label>
							{#if targetUser.role}
								<Select.Root type="single" bind:value={targetUser.role}>
									<Select.Trigger class="w-[50%]">
										{targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1)}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="admin">Admin</Select.Item>
										<Select.Item value="user">User</Select.Item>
									</Select.Content>
								</Select.Root>
							{/if}
						</Field.Set>
					</div>

					{#if targetUser.banned || targetUser.banned === false}
						<div class="col-span-full sm:col-span-3">
							<Field.Set class="gap-2">
								<Field.Label>Disabled</Field.Label>
								<Switch bind:checked={targetUser.banned} />
							</Field.Set>
						</div>
					{/if}
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
								(targetUser.notificationPreferences.dashboard.ticketCreated =
									!targetUser.notificationPreferences.dashboard.ticketCreated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.dashboard.ticketCreated =
										!targetUser.notificationPreferences.dashboard.ticketCreated;
								}
							}}
						>
							<Checkbox
								id="new-ticket-dashboard"
								name="new-ticket-dashboard"
								bind:checked={targetUser.notificationPreferences.dashboard.ticketCreated}
								onclick={() =>
									(targetUser.notificationPreferences.dashboard.ticketCreated =
										!targetUser.notificationPreferences.dashboard.ticketCreated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.dashboard.ticketCreated =
											!targetUser.notificationPreferences.dashboard.ticketCreated;
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
								(targetUser.notificationPreferences.dashboard.itemAssigned =
									!targetUser.notificationPreferences.dashboard.itemAssigned)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.dashboard.itemAssigned =
										!targetUser.notificationPreferences.dashboard.itemAssigned;
								}
							}}
						>
							<Checkbox
								id="item-assigned-dashboard"
								name="item-assigned-dashboard"
								bind:checked={targetUser.notificationPreferences.dashboard.itemAssigned}
								onclick={() =>
									(targetUser.notificationPreferences.dashboard.itemAssigned =
										!targetUser.notificationPreferences.dashboard.itemAssigned)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.dashboard.itemAssigned =
											!targetUser.notificationPreferences.dashboard.itemAssigned;
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
								(targetUser.notificationPreferences.dashboard.itemUpdated =
									!targetUser.notificationPreferences.dashboard.itemUpdated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.dashboard.itemUpdated =
										!targetUser.notificationPreferences.dashboard.itemUpdated;
								}
							}}
						>
							<Checkbox
								id="item-updated-dashboard"
								name="item-updated-dashboard"
								bind:checked={targetUser.notificationPreferences.dashboard.itemUpdated}
								onclick={() =>
									(targetUser.notificationPreferences.dashboard.itemUpdated =
										!targetUser.notificationPreferences.dashboard.itemUpdated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.dashboard.itemUpdated =
											!targetUser.notificationPreferences.dashboard.itemUpdated;
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
								(targetUser.notificationPreferences.dashboard.itemClosed =
									!targetUser.notificationPreferences.dashboard.itemClosed)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.dashboard.itemClosed =
										!targetUser.notificationPreferences.dashboard.itemClosed;
								}
							}}
						>
							<Checkbox
								id="item-closed-dashboard"
								name="item-closed-dashboard"
								bind:checked={targetUser.notificationPreferences.dashboard.itemClosed}
								onclick={() =>
									(targetUser.notificationPreferences.dashboard.itemClosed =
										!targetUser.notificationPreferences.dashboard.itemClosed)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.dashboard.itemClosed =
											!targetUser.notificationPreferences.dashboard.itemClosed;
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
								(targetUser.notificationPreferences.email.ticketCreated =
									!targetUser.notificationPreferences.email.ticketCreated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.email.ticketCreated =
										!targetUser.notificationPreferences.email.ticketCreated;
								}
							}}
						>
							<Checkbox
								id="new-ticket-email"
								name="new-ticket-email"
								bind:checked={targetUser.notificationPreferences.email.ticketCreated}
								onclick={() =>
									(targetUser.notificationPreferences.email.ticketCreated =
										!targetUser.notificationPreferences.email.ticketCreated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.email.ticketCreated =
											!targetUser.notificationPreferences.email.ticketCreated;
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
								(targetUser.notificationPreferences.email.itemAssigned =
									!targetUser.notificationPreferences.email.itemAssigned)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.email.itemAssigned =
										!targetUser.notificationPreferences.email.itemAssigned;
								}
							}}
						>
							<Checkbox
								id="item-assigned-email"
								name="item-assigned-email"
								bind:checked={targetUser.notificationPreferences.email.itemAssigned}
								onclick={() =>
									(targetUser.notificationPreferences.email.itemAssigned =
										!targetUser.notificationPreferences.email.itemAssigned)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.email.itemAssigned =
											!targetUser.notificationPreferences.email.itemAssigned;
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
								(targetUser.notificationPreferences.email.itemUpdated =
									!targetUser.notificationPreferences.email.itemUpdated)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.email.itemUpdated =
										!targetUser.notificationPreferences.email.itemUpdated;
								}
							}}
						>
							<Checkbox
								id="item-updated-email"
								name="item-updated-email"
								bind:checked={targetUser.notificationPreferences.email.itemUpdated}
								onclick={() =>
									(targetUser.notificationPreferences.email.itemUpdated =
										!targetUser.notificationPreferences.email.itemUpdated)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.email.itemUpdated =
											!targetUser.notificationPreferences.email.itemUpdated;
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
								(targetUser.notificationPreferences.email.itemClosed =
									!targetUser.notificationPreferences.email.itemClosed)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									targetUser.notificationPreferences.email.itemClosed =
										!targetUser.notificationPreferences.email.itemClosed;
								}
							}}
						>
							<Checkbox
								id="item-closed-email"
								name="item-closed-email"
								bind:checked={targetUser.notificationPreferences.email.itemClosed}
								onclick={() =>
									(targetUser.notificationPreferences.email.itemClosed =
										!targetUser.notificationPreferences.email.itemClosed)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										targetUser.notificationPreferences.email.itemClosed =
											!targetUser.notificationPreferences.email.itemClosed;
									}
								}}
							/>
							<Field.Label class="font-normal">
								My ticket or task has been closed or resolved by another agent
							</Field.Label>
						</div>
					</div>
				</Field.Set>
			</div>
		</div>
		<Separator class="my-8" />
		<div class="flex items-center justify-end space-x-4">
			<Button
				type="button"
				variant="outline"
				class="whitespace-nowrap"
				onclick={() => goto('/dashboard/settings/users')}>Go back</Button
			>
			<Button type="submit" class="whitespace-nowrap" onclick={handleSave}>Save settings</Button>
		</div>
	</form>
</div>
