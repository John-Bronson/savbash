<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');
	let otp = $state('');
	let verifying = $state(false);
	let otpError = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: authError } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		});

		loading = false;

		if (authError) {
			error = authError.message;
		} else {
			sent = true;
		}
	}

	async function handleVerifyOtp(e: Event) {
		e.preventDefault();
		verifying = true;
		otpError = '';

		const { error: authError } = await supabase.auth.verifyOtp({
			email,
			token: otp,
			type: 'email'
		});

		verifying = false;

		if (authError) {
			otpError = authError.message;
		} else {
			goto('/rides', { invalidateAll: true });
		}
	}

	function handleResend() {
		sent = false;
		otp = '';
		otpError = '';
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="w-full max-w-sm">
		<h1 class="mb-6 text-center text-2xl font-bold text-gray-100">Sign in to SavBash</h1>

		{#if sent}
			<div class="rounded-lg bg-green-900/50 p-4 text-center text-green-300">
				<p class="font-medium">Check your email!</p>
				<p class="mt-1 text-sm">
					We sent a magic link to <strong>{email}</strong>. Click it to sign in.
				</p>
			</div>

			<form onsubmit={handleVerifyOtp} class="mt-6 space-y-4">
				<p class="text-center text-sm text-gray-400">
					Or enter the 6-digit code from the email:
				</p>
				<input
					type="text"
					bind:value={otp}
					maxlength={6}
					inputmode="numeric"
					pattern="[0-9]*"
					autocomplete="one-time-code"
					placeholder="000000"
					class="block w-full rounded-md border-gray-700 bg-gray-800 text-center text-2xl tracking-widest text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>

				{#if otpError}
					<p class="text-sm text-red-400">{otpError}</p>
				{/if}

				<button
					type="submit"
					disabled={verifying || otp.length < 6}

					class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{verifying ? 'Verifying...' : 'Verify Code'}
				</button>
			</form>

			<p class="mt-4 text-center">
				<button
					type="button"
					onclick={handleResend}
					class="text-sm text-blue-400 hover:text-blue-300"
				>
					Resend code
				</button>
			</p>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-300"> Email address </label>
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
