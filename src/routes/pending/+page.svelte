<script lang="ts">
	import { supabase } from '$lib/supabaseClient'

	let { data } = $props()

	async function signOut() {
		await supabase.auth.signOut()
		window.location.href = '/login'
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="w-full max-w-sm text-center">
		<div class="mb-4 text-5xl">🚲</div>
		<h1 class="mb-2 text-2xl font-bold text-gray-100">Hang tight!</h1>
		<p class="mb-6 text-gray-400">
			Your account is pending approval. An existing member needs to let you in.
		</p>
		<p class="mb-6 text-sm text-gray-500">
			Signed in as <strong class="text-gray-300">{data.profile?.christian_name}</strong>
		</p>
		<button
			onclick={signOut}
			class="text-sm text-gray-400 hover:text-gray-200"
		>
			Sign Out
		</button>
	</div>
</div>
