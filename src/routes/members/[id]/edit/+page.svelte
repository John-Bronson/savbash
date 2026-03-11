<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AvatarChooser from '$lib/components/AvatarChooser.svelte';

	let { data, form } = $props();

	let avatarUrl = $state(data.targetProfile?.avatar_url ?? null);
	let avatarEmoji = $state(data.targetProfile?.avatar_emoji ?? null);
	let saved = $state(false);
	let saving = $state(false);

	const displayName = $derived(
		data.targetProfile?.bash_name || data.targetProfile?.christian_name || '(no name)'
	);
</script>

<div class="mx-auto max-w-sm">
	<a href="/members" class="mb-4 inline-block text-sm text-gray-400 hover:text-gray-200">
		&larr; Back to members
	</a>

	<h1 class="mb-2 text-2xl font-bold text-gray-100">Edit Profile — {displayName}</h1>
	{#if data.targetProfile.email}
		<p class="mb-6 text-sm text-gray-500">{data.targetProfile.email}</p>
	{/if}

	{#if saved}
		<div class="mb-4 rounded-lg bg-green-900/50 p-3 text-center text-sm text-green-300">
			Profile saved!
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			saving = true;
			return async ({ update, result }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					await invalidateAll();
					saved = true;
					setTimeout(() => (saved = false), 3000);
				}
				saving = false;
			};
		}}
		class="space-y-5"
	>
		<AvatarChooser
			bind:avatarUrl
			bind:avatarEmoji
			christianName={data.targetProfile?.christian_name ?? ''}
			bashName={data.targetProfile?.bash_name ?? ''}
			userId={data.targetUserId}
		/>

		<div>
			<label for="christian_name" class="block text-sm font-medium text-gray-300">
				Christian name <span class="text-red-400">*</span>
			</label>
			<input
				id="christian_name"
				name="christian_name"
				type="text"
				required
				value={data.targetProfile?.christian_name ?? ''}
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="bash_name" class="block text-sm font-medium text-gray-300"> Bash name </label>
			<input
				id="bash_name"
				name="bash_name"
				type="text"
				value={data.targetProfile?.bash_name ?? ''}
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div class="space-y-3 border-t border-gray-800 pt-5">
			<h2 class="text-sm font-medium text-gray-300">Email notifications</h2>

			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					name="subscribed_to_emails"
					checked={data.targetProfile?.subscribed_to_emails ?? true}
					class="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
				/>
				<span class="text-sm text-gray-400">Email me when a new ride is posted</span>
			</label>

			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					name="notify_on_mention"
					checked={data.targetProfile?.notify_on_mention ?? true}
					class="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
				/>
				<span class="text-sm text-gray-400">Email me when someone @mentions me</span>
			</label>
		</div>

		{#if form?.message}
			<p class="text-sm text-red-400">{form.message}</p>
		{/if}

		<div class="flex gap-3">
			<a
				href="/members"
				class="flex-1 rounded-md border border-gray-700 px-4 py-2 text-center text-gray-300 hover:bg-gray-800"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={saving}
				class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
			>
				{saving ? 'Saving...' : 'Save Profile'}
			</button>
		</div>
	</form>
</div>
