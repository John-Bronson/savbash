<script lang="ts">
	import { enhance } from '$app/forms'
	import { goto } from '$app/navigation'
	import { marked } from 'marked'
	import { onMount } from 'svelte'
	import Avatar from '$lib/components/Avatar.svelte'
	import ImageUpload from '$lib/components/ImageUpload.svelte'
	import MentionInput from '$lib/components/MentionInput.svelte'
	import { timeAgo, highlightMentions } from '$lib/utils'

	let { data, form } = $props()

	let statusOverride = $state<string | null>(null)
	let confirmingDelete = $state(false)
	let commentBody = $state('')
	let submittingComment = $state(false)
	let showReactionPicker = $state<string | null>(null)
	let confirmingDeleteComment = $state<string | null>(null)
	let photoUrl = $state<string | null>(null)
	let photoCaption = $state('')
	let submittingPhoto = $state(false)
	let showPhotoUpload = $state(false)
	let lightboxPhoto = $state<string | null>(null)
	let confirmingDeletePhoto = $state<string | null>(null)

	const reactionEmojis = ['👍', '❤️', '😂', '🔥', '🚴', '💪', '👏']

	const currentStatus = $derived(statusOverride ?? data.currentRsvpStatus)

	const currentUserNames = $derived(
		[data.profile?.christian_name, data.profile?.bash_name].filter(Boolean) as string[]
	)

	function hareDisplayName(hare: { name: string | null; hare_profile: { christian_name: string; bash_name: string | null } | null }) {
		if (hare.hare_profile) return hare.hare_profile.bash_name || hare.hare_profile.christian_name
		return hare.name
	}

	function formatDate(dateStr: string) {
		const d = new Date(dateStr)
		return d.toLocaleDateString('en-US', {
			weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
		})
	}

	function formatTime(dateStr: string) {
		const d = new Date(dateStr)
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
	}

	function mapsUrl(lat: number, lng: number) {
		return `https://www.google.com/maps?q=${lat},${lng}`
	}

	const goingRsvps = $derived(
		data.ride.rsvps.filter((r: { status: string }) => r.status === 'going')
	)
	const maybeRsvps = $derived(
		data.ride.rsvps.filter((r: { status: string }) => r.status === 'maybe')
	)

	const renderedDescription = $derived(
		data.ride.description ? marked.parse(data.ride.description) : ''
	)

	const creatorName = $derived(
		data.ride.creator?.bash_name || data.ride.creator?.christian_name || 'Unknown'
	)

	function groupReactions(reactions: { id: string; user_id: string; emoji: string }[]) {
		const groups: Record<string, { count: number; userReacted: boolean }> = {}
		for (const r of reactions) {
			if (!groups[r.emoji]) groups[r.emoji] = { count: 0, userReacted: false }
			groups[r.emoji].count++
			if (r.user_id === data.user?.id) groups[r.emoji].userReacted = true
		}
		return Object.entries(groups)
	}

	const rsvpButtons = [
		{ status: 'going', label: "I'm In", activeClass: 'bg-green-600 text-white', inactiveClass: 'bg-gray-800 text-gray-400 hover:bg-gray-700' },
		{ status: 'maybe', label: 'Maybe', activeClass: 'bg-yellow-600 text-white', inactiveClass: 'bg-gray-800 text-gray-400 hover:bg-gray-700' },
		{ status: 'not_going', label: "Can't Make It", activeClass: 'bg-red-600 text-white', inactiveClass: 'bg-gray-800 text-gray-400 hover:bg-gray-700' }
	]

	// Highlight targeted comment from URL hash
	let highlightedCommentId = $state<string | null>(null)

	onMount(() => {
		if (window.location.hash) {
			const id = window.location.hash.replace('#comment-', '')
			highlightedCommentId = id
			setTimeout(() => { highlightedCommentId = null }, 3000)
		}
	})
</script>

<svelte:head>
	<title>{data.ride.title} — SavBash</title>
	<meta property="og:title" content={data.ride.title} />
	<meta property="og:description" content={`${formatDate(data.ride.ride_date)} at ${formatTime(data.ride.ride_date)} — ${data.ride.meeting_spot_name}`} />
	{#if data.ride.image_url}
		<meta property="og:image" content={data.ride.image_url} />
	{/if}
	<style>
		html { scroll-behavior: smooth; }
	</style>
</svelte:head>

<div class="mx-auto max-w-2xl">
	<!-- Header -->
	<div class="mb-6">
		<a href="/" class="text-sm text-gray-500 hover:text-gray-400">&larr; Back to rides</a>
	</div>

	<!-- Banner Image -->
	{#if data.ride.image_url}
		<img
			src={data.ride.image_url}
			alt={data.ride.title}
			class="mb-6 w-full rounded-lg object-cover"
			style="max-height: 300px"
		/>
	{/if}

	<h1 class="mb-2 text-3xl font-bold text-gray-100">{data.ride.title}</h1>

	<div class="mb-6 space-y-1 text-gray-400">
		<p>{formatDate(data.ride.ride_date)} at {formatTime(data.ride.ride_date)}</p>
		<p>
			{#if data.ride.meeting_spot_lat && data.ride.meeting_spot_lng}
				<a
					href={mapsUrl(data.ride.meeting_spot_lat, data.ride.meeting_spot_lng)}
					target="_blank"
					rel="noopener noreferrer"
					class="text-blue-400 hover:text-blue-300"
				>
					{data.ride.meeting_spot_name} &nearr;
				</a>
			{:else}
				{data.ride.meeting_spot_name}
			{/if}
		</p>
		{#if data.ride.ride_hares.length > 0}
			<p>
				Hare{data.ride.ride_hares.length > 1 ? 's' : ''}:
				{data.ride.ride_hares.map(hareDisplayName).join(', ')}
			</p>
		{/if}
		<p class="text-sm text-gray-500">Posted by {creatorName}</p>
		{#if data.ride.updated_at}
			<p class="text-xs text-gray-600">
				(edited {new Date(data.ride.updated_at).toLocaleDateString()}{#if data.ride.editor}
					{' '}by {data.ride.editor.bash_name || data.ride.editor.christian_name}
				{/if})
			</p>
		{/if}
	</div>

	<!-- Description -->
	{#if renderedDescription}
		<div class="prose prose-invert mb-8 max-w-none">
			{@html renderedDescription}
		</div>
	{/if}

	<!-- RSVP -->
	{#if data.session}
		<div class="mb-8">
			<h2 class="mb-3 text-lg font-semibold text-gray-200">RSVP</h2>
			<div class="flex gap-3">
				{#each rsvpButtons as btn}
					<form method="POST" action="?/rsvp" use:enhance={() => {
						statusOverride = btn.status
						return async ({ update }) => { statusOverride = null; update() }
					}}>
						<input type="hidden" name="status" value={btn.status} />
						<button
							type="submit"
							class="rounded-md px-4 py-2 text-sm font-medium transition {currentStatus === btn.status ? btn.activeClass : btn.inactiveClass}"
						>
							{btn.label}
						</button>
					</form>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Attendees -->
	{#if goingRsvps.length > 0}
		<div class="mb-6">
			<h3 class="mb-2 text-sm font-medium text-gray-400">Going ({goingRsvps.length})</h3>
			<div class="flex flex-wrap gap-2">
				{#each goingRsvps as rsvp}
					<div class="flex items-center gap-2 rounded-full bg-gray-800 py-1 pl-1 pr-3">
						<Avatar profile={rsvp.rsvp_profile} size="sm" />
						<span class="text-sm text-gray-300">
							{rsvp.rsvp_profile?.bash_name || rsvp.rsvp_profile?.christian_name}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if maybeRsvps.length > 0}
		<div class="mb-6">
			<h3 class="mb-2 text-sm font-medium text-gray-400">Maybe ({maybeRsvps.length})</h3>
			<div class="flex flex-wrap gap-2">
				{#each maybeRsvps as rsvp}
					<div class="flex items-center gap-2 rounded-full bg-gray-800 py-1 pl-1 pr-3">
						<Avatar profile={rsvp.rsvp_profile} size="sm" />
						<span class="text-sm text-gray-300">
							{rsvp.rsvp_profile?.bash_name || rsvp.rsvp_profile?.christian_name}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Photos -->
	<div class="mt-8 border-t border-gray-800 pt-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-200">
				Photos ({data.photos.length})
			</h2>
			{#if data.session}
				<button
					type="button"
					onclick={() => showPhotoUpload = !showPhotoUpload}
					class="text-sm text-blue-400 hover:text-blue-300"
				>
					{showPhotoUpload ? 'Cancel' : '+ Add Photo'}
				</button>
			{/if}
		</div>

		{#if showPhotoUpload}
			<form
				method="POST"
				action="?/uploadPhoto"
				use:enhance={() => {
					submittingPhoto = true
					return async ({ update }) => {
						photoUrl = null
						photoCaption = ''
						submittingPhoto = false
						showPhotoUpload = false
						update()
					}
				}}
				class="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4"
			>
				<ImageUpload
					bucket="ride-photos"
					path={`${data.ride.id}/${crypto.randomUUID()}.webp`}
					bind:value={photoUrl}
					label="Drop a photo or click to upload"
				/>
				<input type="hidden" name="photo_url" value={photoUrl ?? ''} />
				<input
					name="caption"
					type="text"
					bind:value={photoCaption}
					placeholder="Caption (optional)"
					class="mt-3 block w-full rounded-md border-gray-700 bg-gray-800 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
				<div class="mt-3 flex justify-end">
					<button
						type="submit"
						disabled={!photoUrl || submittingPhoto}
						class="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{submittingPhoto ? 'Uploading...' : 'Add Photo'}
					</button>
				</div>
			</form>
		{/if}

		{#if data.photos.length === 0 && !showPhotoUpload}
			<p class="text-sm text-gray-500">No photos yet.</p>
		{/if}

		{#if data.photos.length > 0}
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each data.photos as photo}
					<div class="group relative">
						<button
							type="button"
							onclick={() => lightboxPhoto = photo.photo_url}
							class="block w-full"
						>
							<img
								src={photo.photo_url}
								alt={photo.caption || 'Ride photo'}
								class="aspect-square w-full rounded-lg object-cover transition group-hover:brightness-110"
							/>
						</button>
						{#if photo.caption}
							<p class="mt-1 truncate text-xs text-gray-500">{photo.caption}</p>
						{/if}
						<p class="text-xs text-gray-600">
							{photo.uploader?.bash_name || photo.uploader?.christian_name}
						</p>
						{#if data.user?.id === photo.user_id || data.isMod}
							{#if confirmingDeletePhoto === photo.id}
								<div class="mt-1 flex gap-2">
									<form method="POST" action="?/deletePhoto" use:enhance>
										<input type="hidden" name="photo_id" value={photo.id} />
										<button type="submit" class="text-xs text-red-400 hover:text-red-300">Confirm</button>
									</form>
									<button onclick={() => confirmingDeletePhoto = null} class="text-xs text-gray-500">Cancel</button>
								</div>
							{:else}
								<button
									onclick={() => confirmingDeletePhoto = photo.id}
									class="text-xs text-gray-500 hover:text-gray-400"
								>
									{data.user?.id !== photo.user_id ? 'Delete (admin)' : 'Delete'}
								</button>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Lightbox -->
	{#if lightboxPhoto}
		<button
			type="button"
			onclick={() => lightboxPhoto = null}
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
		>
			<img
				src={lightboxPhoto}
				alt="Full size photo"
				class="max-h-full max-w-full rounded-lg object-contain"
			/>
		</button>
	{/if}

	<!-- Comments -->
	<div class="mt-8 border-t border-gray-800 pt-6">
		<h2 class="mb-4 text-lg font-semibold text-gray-200">
			Comments ({data.comments.filter((c: { is_deleted: boolean }) => !c.is_deleted).length})
		</h2>

		{#if data.comments.length === 0}
			<p class="text-sm text-gray-500">No comments yet. Be the first!</p>
		{/if}

		<div class="space-y-4">
			{#each data.comments as comment}
				<div
					id="comment-{comment.id}"
					class="rounded-lg border border-gray-800 p-3 transition-colors duration-1000 {highlightedCommentId === comment.id ? 'border-blue-500 bg-blue-900/20' : 'bg-gray-900'}"
				>
					{#if comment.is_deleted}
						<p class="text-sm italic text-gray-600">This comment was deleted.</p>
					{:else}
						<div class="flex items-start gap-3">
							<Avatar profile={comment.author} size="sm" />
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-gray-200">
										{comment.author?.bash_name || comment.author?.christian_name}
									</span>
									<span class="text-xs text-gray-600">{timeAgo(comment.created_at)}</span>
									{#if comment.updated_at}
										<span class="text-xs text-gray-600">(edited)</span>
									{/if}
								</div>
								<p class="mt-1 text-sm text-gray-300">
									{@html highlightMentions(comment.body, currentUserNames)}
								</p>

								<!-- Reactions display -->
								<div class="mt-2 flex flex-wrap items-center gap-1">
									{#each groupReactions(comment.reactions) as [emoji, { count, userReacted }]}
										<form method="POST" action="?/react" use:enhance>
											<input type="hidden" name="comment_id" value={comment.id} />
											<input type="hidden" name="emoji" value={emoji} />
											<button
												type="submit"
												class="rounded-full px-2 py-0.5 text-sm transition {userReacted ? 'bg-blue-600/30 ring-1 ring-blue-500' : 'bg-gray-800 hover:bg-gray-700'}"
											>
												{emoji} {count}
											</button>
										</form>
									{/each}

									<!-- Add reaction button -->
									{#if data.session}
										<div class="relative">
											<button
												type="button"
												onclick={() => showReactionPicker = showReactionPicker === comment.id ? null : comment.id}
												class="rounded-full bg-gray-800 px-2 py-0.5 text-sm text-gray-500 hover:bg-gray-700 hover:text-gray-400"
											>
												😀+
											</button>
											{#if showReactionPicker === comment.id}
												<div class="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-lg border border-gray-700 bg-gray-800 p-2 shadow-lg">
													{#each reactionEmojis as emoji}
														<form method="POST" action="?/react" use:enhance={() => {
															showReactionPicker = null
															return async ({ update }) => { update() }
														}}>
															<input type="hidden" name="comment_id" value={comment.id} />
															<input type="hidden" name="emoji" value={emoji} />
															<button
																type="submit"
																class="rounded p-1 text-lg hover:bg-gray-700"
															>
																{emoji}
															</button>
														</form>
													{/each}
												</div>
											{/if}
										</div>
									{/if}

									<!-- Delete button -->
									{#if data.user?.id === comment.user_id || (data.profile && ['moderator', 'admin'].includes(data.profile.role))}
										{#if confirmingDeleteComment === comment.id}
											<form method="POST" action="?/deleteComment" use:enhance>
												<input type="hidden" name="comment_id" value={comment.id} />
												<button type="submit" class="ml-2 text-xs text-red-400 hover:text-red-300">
													Confirm delete
												</button>
											</form>
											<button
												onclick={() => confirmingDeleteComment = null}
												class="text-xs text-gray-500 hover:text-gray-400"
											>
												Cancel
											</button>
										{:else}
											<button
												onclick={() => confirmingDeleteComment = comment.id}
												class="ml-2 text-xs text-gray-500 hover:text-gray-400"
											>
												{data.user?.id !== comment.user_id ? 'Delete (admin)' : 'Delete'}
											</button>
										{/if}
									{/if}
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Post comment -->
		{#if data.session}
			<form
				method="POST"
				action="?/comment"
				use:enhance={() => {
					submittingComment = true
					return async ({ update }) => {
						commentBody = ''
						submittingComment = false
						update()
					}
				}}
				class="mt-4"
			>
				<div class="flex gap-3">
					<Avatar profile={data.profile} size="sm" />
					<div class="flex-1">
						<MentionInput
							bind:value={commentBody}
							name="body"
							placeholder="Add a comment... Use @ to mention someone"
							members={data.members}
						/>
					</div>
				</div>
				<div class="mt-2 flex justify-end">
					<button
						type="submit"
						disabled={submittingComment || !commentBody.trim()}
						class="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{submittingComment ? 'Posting...' : 'Post'}
					</button>
				</div>
			</form>
		{/if}
	</div>

	<!-- Edit/Delete Ride -->
	{#if data.canEdit}
		{@const label = data.isMod ? (data.isCreator || data.isHare ? 'Hare / Admin' : 'Admin') : data.isHare ? 'Hare' : 'Your Ride'}
		<div class="mt-8 border-t border-gray-800 pt-6">
			<div class="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
				<p class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
				<div class="flex gap-3">
					<a
						href="/rides/{data.ride.id}/edit"
						class="rounded-md bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
					>
						Edit Ride
					</a>
					{#if !confirmingDelete}
						<button
							onclick={() => confirmingDelete = true}
							class="rounded-md bg-gray-800 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
						>
							Delete Ride
						</button>
					{:else}
						<form method="POST" action="?/deleteRide" use:enhance={() => {
							return async () => { goto('/') }
						}}>
							<button
								type="submit"
								class="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
							>
								Confirm Delete
							</button>
						</form>
						<button
							onclick={() => confirmingDelete = false}
							class="rounded-md bg-gray-800 px-4 py-2 text-sm text-gray-400 hover:bg-gray-700"
						>
							Cancel
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
