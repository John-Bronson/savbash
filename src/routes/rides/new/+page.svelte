<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import PlacesAutocomplete from '$lib/components/PlacesAutocomplete.svelte';

	let { data, form } = $props();

	let hare1Mode = $state<'member' | 'text'>('member');
	let hare2Mode = $state<'member' | 'text'>('member');
	let showHare2 = $state(false);
	let submitting = $state(false);
	let bannerUrl = $state<string | null>(null);
	let meetingSpotName = $state('');
	let meetingSpotLat = $state<number | null>(null);
	let meetingSpotLng = $state<number | null>(null);
</script>

<div class="mx-auto max-w-lg">
	<h1 class="mb-6 text-2xl font-bold text-gray-100">Post a Ride</h1>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				if (result.type === 'redirect') {
					goto(result.location, { replaceState: true });
				} else {
					submitting = false;
					update();
				}
			};
		}}
		class="space-y-5"
	>
		<div>
			<label for="title" class="block text-sm font-medium text-gray-300">
				Title <span class="text-red-400">*</span>
			</label>
			<input
				id="title"
				name="title"
				type="text"
				required
				placeholder="e.g. Sunday Hash Run #42"
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
					class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div>
			<label for="meeting_spot_name" class="block text-sm font-medium text-gray-300">
				Meeting spot <span class="text-red-400">*</span>
			</label>
			<PlacesAutocomplete
				bind:nameValue={meetingSpotName}
				bind:latValue={meetingSpotLat}
				bind:lngValue={meetingSpotLng}
				apiKey={data.googleMapsApiKey}
			/>
		</div>

		<div>
			<label for="description" class="block text-sm font-medium text-gray-300"> Description </label>
			<p class="mt-0.5 text-xs text-gray-500">Formatting: **bold**, *italic*, bullet lists</p>
			<textarea
				id="description"
				name="description"
				rows="4"
				placeholder="Trail details, what to bring, etc."
				class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			></textarea>
		</div>

		<!-- Banner Image -->
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-300">Banner image</label>
			<ImageUpload
				bucket="ride-images"
				path={`banners/${crypto.randomUUID()}.webp`}
				bind:value={bannerUrl}
				label="Drop an image or click to upload"
			/>
		</div>

		<!-- Hare 1 -->
		<div>
			<label class="block text-sm font-medium text-gray-300"> Hare 1 </label>
			<div class="mt-1 flex gap-2">
				<button
					type="button"
					onclick={() => (hare1Mode = 'member')}
					class="rounded px-2 py-1 text-xs {hare1Mode === 'member'
						? 'bg-blue-600 text-white'
						: 'bg-gray-800 text-gray-400'}"
				>
					Member
				</button>
				<button
					type="button"
					onclick={() => (hare1Mode = 'text')}
					class="rounded px-2 py-1 text-xs {hare1Mode === 'text'
						? 'bg-blue-600 text-white'
						: 'bg-gray-800 text-gray-400'}"
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
						<option value={profile.id}>
							{profile.bash_name || profile.christian_name}
						</option>
					{/each}
				</select>
			{:else}
				<input
					name="hare1_name"
					type="text"
					placeholder="Name"
					class="mt-2 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			{/if}
		</div>

		<!-- Hare 2 -->
		{#if !showHare2}
			<button
				type="button"
				onclick={() => (showHare2 = true)}
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
						onclick={() => (showHare2 = false)}
						class="text-xs text-gray-500 hover:text-gray-400"
					>
						Remove
					</button>
				</div>
				<div class="mt-1 flex gap-2">
					<button
						type="button"
						onclick={() => (hare2Mode = 'member')}
						class="rounded px-2 py-1 text-xs {hare2Mode === 'member'
							? 'bg-blue-600 text-white'
							: 'bg-gray-800 text-gray-400'}"
					>
						Member
					</button>
					<button
						type="button"
						onclick={() => (hare2Mode = 'text')}
						class="rounded px-2 py-1 text-xs {hare2Mode === 'text'
							? 'bg-blue-600 text-white'
							: 'bg-gray-800 text-gray-400'}"
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
							<option value={profile.id}>
								{profile.bash_name || profile.christian_name}
							</option>
						{/each}
					</select>
				{:else}
					<input
						name="hare2_name"
						type="text"
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
			disabled={submitting}
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{submitting ? 'Posting...' : 'Post Ride'}
		</button>
	</form>
</div>
