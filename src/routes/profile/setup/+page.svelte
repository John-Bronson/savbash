<script lang="ts">
	import { enhance } from '$app/forms'
	import AvatarChooser from '$lib/components/AvatarChooser.svelte'

	let { data, form } = $props()

	let avatarUrl = $state(data.profile?.avatar_url ?? null)
	let avatarEmoji = $state(data.profile?.avatar_emoji ?? null)
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="w-full max-w-sm">
		<h1 class="mb-2 text-center text-2xl font-bold text-gray-100">
			Welcome to SavBash!
		</h1>
		<p class="mb-6 text-center text-sm text-gray-400">
			Set up your profile to get started.
		</p>

		<form method="POST" use:enhance class="space-y-5">
			<AvatarChooser
				bind:avatarUrl
				bind:avatarEmoji
				christianName={form?.christianName ?? data.profile?.christian_name ?? ''}
				bashName={form?.bashName ?? data.profile?.bash_name ?? ''}
				userId={data.userId}
			/>

			<div>
				<label for="christian_name" class="block text-sm font-medium text-gray-300">
					Christian name <span class="text-red-400">*</span>
				</label>
				<p class="mt-0.5 text-xs text-gray-500">Your real name</p>
				<input
					id="christian_name"
					name="christian_name"
					type="text"
					required
					value={form?.christianName ?? data.profile?.christian_name ?? ''}
					class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="bash_name" class="block text-sm font-medium text-gray-300">
					Bash name
				</label>
				<p class="mt-0.5 text-xs text-gray-500">Your hash name, if you've earned one</p>
				<input
					id="bash_name"
					name="bash_name"
					type="text"
					value={form?.bashName ?? data.profile?.bash_name ?? ''}
					class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>

			{#if form?.message}
				<p class="text-sm text-red-400">{form.message}</p>
			{/if}

			<button
				type="submit"
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			>
				Let's Ride
			</button>
		</form>
	</div>
</div>
