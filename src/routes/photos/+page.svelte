<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	let rideGroups = $state(data.rideGroups);
	let nextCursor = $state(data.nextCursor);
	let loading = $state(false);
	let lightboxPhoto = $state<{
		id: string;
		photo_url: string;
		caption: string | null;
		photo_reactions: { id: string; user_id: string; emoji: string }[];
	} | null>(null);

	const reactionEmojis = ['👍', '❤️', '😂', '🔥', '🚴', '💪', '👏'];

	function groupReactions(reactions: { id: string; user_id: string; emoji: string }[]) {
		const groups: Record<string, { count: number; userReacted: boolean }> = {};
		for (const r of reactions) {
			if (!groups[r.emoji]) groups[r.emoji] = { count: 0, userReacted: false };
			groups[r.emoji].count++;
			if (r.user_id === data.user?.id) groups[r.emoji].userReacted = true;
		}
		return Object.entries(groups);
	}

	function formatDate(dateStr: string) {
		const d = new Date(dateStr);
		return d.toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	let sentinel = $state<HTMLDivElement | null>(null);

	onMount(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && nextCursor && !loading) {
					loadMore();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	async function loadMore() {
		if (!nextCursor || loading) return;
		loading = true;
		try {
			const res = await fetch(`/photos/api?cursor=${encodeURIComponent(nextCursor)}`);
			const json = await res.json();
			rideGroups = [...rideGroups, ...json.rideGroups];
			nextCursor = json.nextCursor;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Photos — SavBash</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<h1 class="mb-6 text-2xl font-bold text-gray-100">Photos</h1>

	{#if rideGroups.length === 0 && !loading}
		<p class="text-gray-500">No photos yet.</p>
	{/if}

	{#each rideGroups as ride}
		<div class="mb-8">
			<div class="mb-3 flex items-baseline gap-3">
				<a href="/rides/{ride.id}" class="text-lg font-semibold text-gray-200 hover:text-gray-100">
					{ride.title}
				</a>
				<span class="text-sm text-gray-500">{formatDate(ride.ride_date)}</span>
			</div>

			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each ride.ride_photos as photo}
					<div class="group relative">
						<button type="button" onclick={() => (lightboxPhoto = photo)} class="block w-full">
							<img
								src={photo.photo_url}
								alt={photo.caption || 'Ride photo'}
								class="aspect-square w-full rounded-lg object-cover transition group-hover:brightness-110"
							/>
						</button>

						{#if photo.photo_reactions?.length > 0}
							<div class="absolute bottom-1 left-1 flex gap-1">
								{#each groupReactions(photo.photo_reactions) as [emoji, { count }]}
									<span class="rounded-full bg-black/50 px-1.5 py-0.5 text-xs backdrop-blur-sm">
										{emoji}
										{count}
									</span>
								{/each}
							</div>
						{/if}

						{#if photo.caption}
							<p class="mt-1 truncate text-xs text-gray-500">{photo.caption}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<!-- Infinite scroll sentinel -->
	<div bind:this={sentinel} class="h-1"></div>

	{#if loading}
		<div class="flex justify-center py-8">
			<div
				class="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300"
			></div>
		</div>
	{/if}

	{#if !nextCursor && rideGroups.length > 0}
		<p class="py-8 text-center text-sm text-gray-600">No more photos</p>
	{/if}
</div>

<!-- Lightbox -->
{#if lightboxPhoto}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) lightboxPhoto = null;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') lightboxPhoto = null;
		}}
	>
		<button
			type="button"
			onclick={() => (lightboxPhoto = null)}
			class="absolute top-4 right-4 rounded-full bg-gray-800/80 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
		>
			Close
		</button>
		<img
			src={lightboxPhoto.photo_url}
			alt={lightboxPhoto.caption || 'Full size photo'}
			class="max-h-[80vh] max-w-full rounded-lg object-contain"
		/>
		{#if lightboxPhoto.caption}
			<p class="mt-2 text-sm text-gray-400">{lightboxPhoto.caption}</p>
		{/if}
		<div class="mt-3 flex flex-wrap items-center justify-center gap-2">
			{#each groupReactions(lightboxPhoto.photo_reactions ?? []) as [emoji, { count, userReacted }]}
				<span
					class="rounded-full px-2.5 py-1 text-sm {userReacted
						? 'bg-blue-600/30 ring-1 ring-blue-500'
						: 'bg-gray-800'}"
				>
					{emoji}
					{count}
				</span>
			{/each}
		</div>
	</div>
{/if}
