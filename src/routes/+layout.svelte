<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { supabase } from '$lib/supabaseClient';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data, children } = $props();

	const displayName = $derived(data.profile?.bash_name || data.profile?.christian_name || null);

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="border-b border-gray-800 bg-gray-900">
	<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
		<a href="/" class="text-lg font-bold text-gray-100">SavBash</a>

		<div class="flex items-center gap-4">
			{#if data.session}
				{#if data.profile && data.profile.role !== 'pending'}
					<a href="/members" class="text-sm text-gray-400 hover:text-gray-200">Members</a>
				{/if}
				<a href="/notifications" class="relative text-gray-400 hover:text-gray-200">
					<span class="text-lg">🔔</span>
					{#if data.unreadMentionCount > 0}
						<span
							class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
						>
							{data.unreadMentionCount}
						</span>
					{/if}
				</a>
				<a href="/profile" class="flex items-center gap-2 hover:opacity-80">
					<Avatar profile={data.profile} size="sm" />
					<span class="hidden text-sm text-gray-400 sm:inline">{displayName}</span>
				</a>
				<button onclick={signOut} class="text-sm text-gray-400 hover:text-gray-200">
					Sign Out
				</button>
			{:else}
				<a href="/login" class="text-sm text-gray-400 hover:text-gray-200"> Sign In </a>
			{/if}
		</div>
	</div>
</nav>

<main class="mx-auto max-w-4xl px-4 py-8">
	{@render children()}
</main>
