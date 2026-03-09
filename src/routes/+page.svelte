<script lang="ts">
	import { enhance } from '$app/forms'

	let { data } = $props()

	function rsvpCount(rsvps: { status: string }[], status: string) {
		return rsvps.filter((r) => r.status === status).length
	}

	function hareDisplayName(hare: { name: string | null; profiles: { christian_name: string; bash_name: string | null } | null }) {
		if (hare.profiles) return hare.profiles.bash_name || hare.profiles.christian_name
		return hare.name
	}

	function formatDate(dateStr: string) {
		const d = new Date(dateStr)
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
	}

	function formatTime(dateStr: string) {
		const d = new Date(dateStr)
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold text-gray-100">Upcoming Rides</h1>
	{#if data.session}
		<a
			href="/rides/new"
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			Post a Ride
		</a>
	{/if}
</div>

{#if data.upcomingRides.length === 0}
	<p class="text-gray-500">No upcoming rides yet. Be the first to post one!</p>
{:else}
	<div class="space-y-4">
		{#each data.upcomingRides as ride}
			<a
				href="/rides/{ride.id}"
				class="block rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
			>
				<div class="flex items-start justify-between">
					<div>
						<h2 class="text-lg font-semibold text-gray-100">{ride.title}</h2>
						<p class="mt-1 text-sm text-gray-400">
							{formatDate(ride.ride_date)} at {formatTime(ride.ride_date)}
						</p>
						<p class="mt-1 text-sm text-gray-500">{ride.meeting_spot_name}</p>
						{#if ride.ride_hares.length > 0}
							<p class="mt-1 text-sm text-gray-500">
								Hare{ride.ride_hares.length > 1 ? 's' : ''}:
								{ride.ride_hares.map(hareDisplayName).join(', ')}
							</p>
						{/if}
					</div>
					<div class="text-right text-sm">
						<span class="text-green-400">{rsvpCount(ride.rsvps, 'going')} going</span>
						{#if rsvpCount(ride.rsvps, 'maybe') > 0}
							<span class="ml-2 text-yellow-400">{rsvpCount(ride.rsvps, 'maybe')} maybe</span>
						{/if}
					</div>
				</div>
			</a>
		{/each}
	</div>
{/if}

{#if data.pastRides.length > 0}
	<h2 class="mb-4 mt-12 text-xl font-bold text-gray-100">Past Rides</h2>
	<div class="space-y-3">
		{#each data.pastRides as ride}
			<a
				href="/rides/{ride.id}"
				class="block rounded-lg border border-gray-800 bg-gray-900/50 p-3 transition hover:border-gray-700"
			>
				<div class="flex items-center justify-between">
					<div>
						<h3 class="font-medium text-gray-300">{ride.title}</h3>
						<p class="text-sm text-gray-500">{formatDate(ride.ride_date)}</p>
					</div>
					<span class="text-sm text-gray-500">{rsvpCount(ride.rsvps, 'going')} went</span>
				</div>
			</a>
		{/each}
	</div>
{/if}

{#if data.pendingUsers.length > 0}
	<div class="mt-12 rounded-lg border border-yellow-800 bg-yellow-900/30 p-4">
		<h2 class="mb-3 font-semibold text-yellow-300">
			Pending Approval ({data.pendingUsers.length})
		</h2>
		<ul class="space-y-2">
			{#each data.pendingUsers as pending}
				<li class="flex items-center justify-between">
					<div>
						<span class="font-medium text-gray-100">{pending.christian_name}</span>
						{#if pending.email}
							<span class="ml-2 text-sm text-gray-500">{pending.email}</span>
						{/if}
					</div>
					<form method="POST" action="?/approve" use:enhance>
						<input type="hidden" name="user_id" value={pending.id} />
						<button
							type="submit"
							class="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
						>
							Approve
						</button>
					</form>
				</li>
			{/each}
		</ul>
	</div>
{/if}
