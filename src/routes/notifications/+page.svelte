<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/Avatar.svelte';
	import { timeAgo } from '$lib/utils';

	let { data } = $props();

	const hasUnread = $derived(data.mentions.some((m: { is_read: boolean }) => !m.is_read));
</script>

<div class="mx-auto max-w-2xl">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-100">Notifications</h1>
		{#if hasUnread}
			<form method="POST" action="?/markAllRead" use:enhance>
				<button type="submit" class="text-sm text-blue-400 hover:text-blue-300">
					Mark all as read
				</button>
			</form>
		{/if}
	</div>

	{#if data.mentions.length === 0}
		<div class="py-12 text-center">
			<div class="mb-3 text-4xl">🔔</div>
			<p class="text-gray-500">No mentions yet — go join a ride!</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.mentions as mention}
				<a
					href="/rides/{mention.ride?.id}#comment-{mention.comment_id}"
					class="flex items-start gap-3 rounded-lg border p-3 transition {mention.is_read
						? 'border-gray-800 bg-gray-900/50'
						: 'border-gray-700 bg-gray-900'}"
				>
					<Avatar profile={mention.comment?.author} size="sm" />
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span
								class="text-sm font-medium {mention.is_read ? 'text-gray-400' : 'text-gray-200'}"
							>
								{mention.comment?.author?.bash_name || mention.comment?.author?.christian_name}
							</span>
							<span class="text-xs text-gray-600"> mentioned you in </span>
							<span class="truncate text-xs text-gray-500">
								{mention.ride?.title}
							</span>
						</div>
						<p class="mt-1 truncate text-sm {mention.is_read ? 'text-gray-500' : 'text-gray-300'}">
							{mention.comment?.body?.slice(0, 80)}{mention.comment?.body?.length > 80 ? '...' : ''}
						</p>
						<span class="mt-1 text-xs text-gray-600">{timeAgo(mention.created_at)}</span>
					</div>
					{#if !mention.is_read}
						<div class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"></div>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>
