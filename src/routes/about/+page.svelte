<script lang="ts">
	let { data } = $props();
</script>

<div class="mx-auto max-w-2xl">
	<h1 class="text-3xl font-bold text-gray-100">About SavBash</h1>

	<div class="mt-6 space-y-4 text-gray-300">
		<p>
			SavBash is the online home of Savannah's Hash House Harriers — a drinking club with a
			pedaling problem. We're part of a worldwide tradition that started in 1938 in Kuala Lumpur,
			where a group of British officers would lay trails of paper through the jungle and chase each
			other down, all for the reward of a cold beer at the end.
		</p>

		<p>
			Every ride, one or more "hares" lay a trail of chalk, flour, or shredded paper through the
			streets, parks, and hidden corners of Savannah. The "pack" follows, solving trail marks,
			calling out checks, and generally having a great time. No experience required — all you need is a bicycle
			 and all levels are welcome.
		</p>

		<p>
			This site is where we coordinate our rides: post upcoming trails, RSVP, share photos, and stay
			connected between bashes. If you'd like to join us, sign up and come out to the next ride.
			First timers are always free.
		</p>
	</div>

	{#if !data.session}
	<div class="mt-8">
		<a
			href="/login"
			class="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
		>
			Sign Up / Sign In
		</a>
	</div>
	{/if}
</div>
