<script lang="ts">
	import { supabase } from '$lib/supabaseClient'

	let email = $state('')
	let loading = $state(false)
	let sent = $state(false)
	let error = $state('')

	async function handleSubmit(e: Event) {
		e.preventDefault()
		loading = true
		error = ''

		const { error: authError } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		})

		loading = false

		if (authError) {
			error = authError.message
		} else {
			sent = true
		}
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="w-full max-w-sm">
		<h1 class="mb-6 text-center text-2xl font-bold text-gray-100">
			Sign in to SavBash
		</h1>

		{#if sent}
			<div class="rounded-lg bg-green-900/50 p-4 text-center text-green-300">
				<p class="font-medium">Check your email!</p>
				<p class="mt-1 text-sm">
					We sent a magic link to <strong>{email}</strong>. Click it to sign in.
				</p>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-300">
						Email address
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						placeholder="you@example.com"
						class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>

				{#if error}
					<p class="text-sm text-red-400">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? 'Sending...' : 'Send Magic Link'}
				</button>
			</form>
		{/if}
	</div>
</div>
