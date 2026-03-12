<script lang="ts">
	let { data } = $props();
</script>

<div class="flex min-h-[70vh] flex-col items-center justify-center text-center">
	<h1 class="text-5xl font-bold text-gray-100">SavBash</h1>
	<p class="mt-4 max-w-lg text-lg text-gray-400">
		The home of Savannah's mutant bicycle-bound cousin to the Hash House Harriers - Savannah Bash!
		Join us for weekly trail runs, good company, and post-run festivities. Whether you're a seasoned hasher, basher,
		or brand new to the pack, all are welcome on trail.
	</p>

	<div class="mt-8 flex gap-4">
		{#if data.session}
			<a
				href="/rides"
				class="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
			>
				Go to Rides
			</a>
		{:else}
			<a
				href="/login"
				class="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
			>
				Sign In
			</a>
		{/if}
		<a
			href="/about"
			class="rounded-md border border-gray-700 px-6 py-3 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-gray-100"
		>
			Learn More
		</a>
	</div>
</div>
