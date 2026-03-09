<script lang="ts">
	import { enhance } from '$app/forms'
	import ImageUpload from '$lib/components/ImageUpload.svelte'

	let { data, form } = $props()

	const hare1 = $derived(data.ride.ride_hares[0])
	const hare2 = $derived(data.ride.ride_hares[1])

	let hare1Mode = $state<'member' | 'text'>(data.ride.ride_hares[0]?.user_id ? 'member' : 'text')
	let hare2Mode = $state<'member' | 'text'>(data.ride.ride_hares[1]?.user_id ? 'member' : 'text')
	let showHare2 = $state(!!data.ride.ride_hares[1])
	let bannerUrl = $state<string | null>(data.ride.image_url)
</script>

<div class="mx-auto max-w-lg">
	<div class="mb-6">
		<a href="/rides/{data.ride.id}" class="text-sm text-gray-500 hover:text-gray-400">&larr; Back to ride</a>
	</div>

	<h1 class="mb-6 text-2xl font-bold text-gray-100">Edit Ride</h1>

	<form method="POST" use:enhance class="space-y-5">
		<div>
			<label for="title" class="block text-sm font-medium text-gray-300">
				Title <span class="text-red-400">*</span>
			</label>
			<input
				id="title"
				name="title"
				type="text"
				required
				value={data.ride.title}
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="ride_date" class="block text-sm font-medium text-gray-300">
					Date <span class="text-red-400">*</span>
				</label>
				<input
					id="ride_date"
					name="ride_date"
					type="date"
					required
					value={data.dateStr}
					class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label for="ride_time" class="block text-sm font-medium text-gray-300">
					Time <span class="text-red-400">*</span>
				</label>
				<input
					id="ride_time"
					name="ride_time"
					type="time"
					required
					value={data.timeStr}
					class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div>
			<label for="meeting_spot_name" class="block text-sm font-medium text-gray-300">
				Meeting spot <span class="text-red-400">*</span>
			</label>
			<input
				id="meeting_spot_name"
				name="meeting_spot_name"
				type="text"
				required
				value={data.ride.meeting_spot_name}
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<input type="hidden" name="meeting_spot_lat" value={data.ride.meeting_spot_lat ?? ''} />
			<input type="hidden" name="meeting_spot_lng" value={data.ride.meeting_spot_lng ?? ''} />
		</div>

		<div>
			<label for="description" class="block text-sm font-medium text-gray-300">
				Description
			</label>
			<p class="mt-0.5 text-xs text-gray-500">Formatting: **bold**, *italic*, bullet lists</p>
			<textarea
				id="description"
				name="description"
				rows="4"
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			>{data.ride.description ?? ''}</textarea>
		</div>

		<!-- Banner Image -->
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-300">Banner image</label>
			<ImageUpload
				bucket="ride-images"
				path={`banners/${data.ride.id}.webp`}
				bind:value={bannerUrl}
				label="Drop an image or click to upload"
			/>
		</div>

		<!-- Hare 1 -->
		<div>
			<label class="block text-sm font-medium text-gray-300">Hare 1</label>
			<div class="mt-1 flex gap-2">
				<button
					type="button"
					onclick={() => hare1Mode = 'member'}
					class="rounded px-2 py-1 text-xs {hare1Mode === 'member' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}"
				>
					Member
				</button>
				<button
					type="button"
					onclick={() => hare1Mode = 'text'}
					class="rounded px-2 py-1 text-xs {hare1Mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}"
				>
					Not on app
				</button>
			</div>
			{#if hare1Mode === 'member'}
				<select
					name="hare1_id"
					class="mt-2 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				>
					<option value="">Select a member</option>
					{#each data.profiles as profile}
						<option value={profile.id} selected={profile.id === hare1?.user_id}>
							{profile.bash_name || profile.christian_name}
						</option>
					{/each}
				</select>
			{:else}
				<input
					name="hare1_name"
					type="text"
					value={hare1?.name ?? ''}
					placeholder="Name"
					class="mt-2 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			{/if}
		</div>

		<!-- Hare 2 -->
		{#if !showHare2}
			<button
				type="button"
				onclick={() => showHare2 = true}
				class="text-sm text-blue-400 hover:text-blue-300"
			>
				+ Add second hare
			</button>
		{:else}
			<div>
				<div class="flex items-center justify-between">
					<label class="block text-sm font-medium text-gray-300">Hare 2</label>
					<button
						type="button"
						onclick={() => showHare2 = false}
						class="text-xs text-gray-500 hover:text-gray-400"
					>
						Remove
					</button>
				</div>
				<div class="mt-1 flex gap-2">
					<button
						type="button"
						onclick={() => hare2Mode = 'member'}
						class="rounded px-2 py-1 text-xs {hare2Mode === 'member' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}"
					>
						Member
					</button>
					<button
						type="button"
						onclick={() => hare2Mode = 'text'}
						class="rounded px-2 py-1 text-xs {hare2Mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}"
					>
						Not on app
					</button>
				</div>
				{#if hare2Mode === 'member'}
					<select
						name="hare2_id"
						class="mt-2 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					>
						<option value="">Select a member</option>
						{#each data.profiles as profile}
							<option value={profile.id} selected={profile.id === hare2?.user_id}>
								{profile.bash_name || profile.christian_name}
							</option>
						{/each}
					</select>
				{:else}
					<input
						name="hare2_name"
						type="text"
						value={hare2?.name ?? ''}
						placeholder="Name"
						class="mt-2 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				{/if}
			</div>
		{/if}

		{#if form?.message}
			<p class="text-sm text-red-400">{form.message}</p>
		{/if}

		<button
			type="submit"
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
		>
			Save Changes
		</button>
	</form>
</div>
