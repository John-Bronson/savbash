<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let emailsValue = $state(data.notificationEmails.join(', '));
	let saved = $state(false);
</script>

<svelte:head>
	<title>Admin Settings — SavBash</title>
</svelte:head>

<h1 class="mb-8 text-2xl font-bold text-gray-100">Admin Settings</h1>

<section class="rounded-xl border border-gray-700 bg-gray-900 p-6">
	<h2 class="mb-2 text-lg font-semibold text-gray-100">Signup Notification Emails</h2>
	<p class="mb-4 text-sm text-gray-400">
		When a new user signs up, a notification email will be sent to these addresses so someone can
		approve them on the Members page. Separate multiple addresses with commas or newlines.
	</p>

	<form
		method="POST"
		action="?/updateEmails"
		use:enhance={() => {
			saved = false;
			return async ({ update }) => {
				await update();
				if (!form?.message) {
					saved = true;
				}
			};
		}}
	>
		<textarea
			name="emails"
			rows="4"
			class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
			placeholder="admin@example.com, other@example.com"
			bind:value={emailsValue}
		></textarea>

		{#if form?.message}
			<p class="mt-2 text-sm text-red-400">{form.message}</p>
		{/if}

		{#if saved}
			<p class="mt-2 text-sm text-green-400">Settings saved.</p>
		{/if}

		<button
			type="submit"
			class="mt-4 cursor-pointer rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500"
		>
			Save
		</button>
	</form>
</section>
