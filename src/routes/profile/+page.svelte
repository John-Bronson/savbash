<script lang="ts">
	import { enhance } from '$app/forms'
	import AvatarChooser from '$lib/components/AvatarChooser.svelte'

	let { data, form } = $props()

	let avatarUrl = $state(data.profile?.avatar_url ?? null)
	let avatarEmoji = $state(data.profile?.avatar_emoji ?? null)
	let saved = $state(false)

	$effect(() => {
		if (form?.success) {
			saved = true
			setTimeout(() => (saved = false), 3000)
		}
	})
</script>

<div class="mx-auto max-w-sm">
	<h1 class="mb-6 text-2xl font-bold text-gray-100">Your Profile</h1>

	{#if saved}
		<div class="mb-4 rounded-lg bg-green-900/50 p-3 text-center text-sm text-green-300">
			Profile saved!
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-5">
		<AvatarChooser
			bind:avatarUrl
			bind:avatarEmoji
			christianName={data.profile?.christian_name ?? ''}
			bashName={data.profile?.bash_name ?? ''}
			userId={data.userId}
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
				value={data.profile?.christian_name ?? ''}
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="bash_name" class="block text-sm font-medium text-gray-300">
				Bash name
			</label>
			<input
				id="bash_name"
				name="bash_name"
				type="text"
				value={data.profile?.bash_name ?? ''}
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div class="space-y-3 border-t border-gray-800 pt-5">
			<h2 class="text-sm font-medium text-gray-300">Email notifications</h2>

			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					name="subscribed_to_emails"
					checked={data.profile?.subscribed_to_emails ?? true}
					class="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
				/>
				<span class="text-sm text-gray-400">Email me when a new ride is posted</span>
			</label>

			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					name="notify_on_mention"
					checked={data.profile?.notify_on_mention ?? true}
					class="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
				/>
				<span class="text-sm text-gray-400">Email me when someone @mentions me</span>
			</label>
		</div>

		{#if form?.message}
			<p class="text-sm text-red-400">{form.message}</p>
		{/if}

		<button
			type="submit"
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
		>
			Save Profile
		</button>
	</form>
</div>
