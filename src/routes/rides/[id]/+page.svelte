<script lang="ts">
	import { enhance } from '$app/forms'
	import { goto } from '$app/navigation'
	import { marked } from 'marked'
	import Avatar from '$lib/components/Avatar.svelte'

	let { data, form } = $props()

	let statusOverride = $state<string | null>(null)
	let confirmingDelete = $state(false)

	const currentStatus = $derived(statusOverride ?? data.currentRsvpStatus)

	function hareDisplayName(hare: { name: string | null; hare_profile: { christian_name: string; bash_name: string | null } | null }) {
		if (hare.hare_profile) return hare.hare_profile.bash_name || hare.hare_profile.christian_name
		return hare.name
	}

	function formatDate(dateStr: string) {
		const d = new Date(dateStr)
		return d.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
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

	const rsvpButtons = [
		{ status: 'going', label: "I'm In", activeClass: 'bg-green-600 text-white', inactiveClass: 'bg-gray-800 text-gray-400 hover:bg-gray-700' },
		{ status: 'maybe', label: 'Maybe', activeClass: 'bg-yellow-600 text-white', inactiveClass: 'bg-gray-800 text-gray-400 hover:bg-gray-700' },
		{ status: 'not_going', label: "Can't Make It", activeClass: 'bg-red-600 text-white', inactiveClass: 'bg-gray-800 text-gray-400 hover:bg-gray-700' }
	]
</script>

<div class="mx-auto max-w-2xl">
	<!-- Header -->
	<div class="mb-6">
		<a href="/" class="text-sm text-gray-500 hover:text-gray-400">&larr; Back to rides</a>
	</div>

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
			<h3 class="mb-2 text-sm font-medium text-gray-400">
				Going ({goingRsvps.length})
			</h3>
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
			<h3 class="mb-2 text-sm font-medium text-gray-400">
				Maybe ({maybeRsvps.length})
			</h3>
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

	<!-- Edit/Delete -->
	{#if data.canEdit}
		<div class="mt-8 border-t border-gray-800 pt-6">
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
	{/if}
</div>
