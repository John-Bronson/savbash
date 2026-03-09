<script lang="ts">
	import Avatar from './Avatar.svelte'

	let {
		avatarUrl = $bindable<string | null>(null),
		avatarEmoji = $bindable<string | null>(null),
		christianName = '',
		bashName = '',
		userId
	}: {
		avatarUrl: string | null
		avatarEmoji: string | null
		christianName: string
		bashName: string
		userId: string
	} = $props()

	let tab = $state<'photo' | 'emoji'>(avatarEmoji ? 'emoji' : 'photo')
	let uploading = $state(false)
	let fileInput: HTMLInputElement

	const previewProfile = $derived({
		christian_name: christianName,
		bash_name: bashName,
		avatar_url: avatarUrl,
		avatar_emoji: avatarEmoji
	})

	const emojiGroups = [
		{
			label: 'Faces',
			emojis: ['😀', '😎', '🤠', '🥳', '😈', '🤡', '👻', '💀', '🤖', '👽', '😺', '🦊']
		},
		{
			label: 'Sports & Activity',
			emojis: ['🚴', '🏃', '🚵', '🏋️', '🧗', '🏄', '⛷️', '🤸', '🏊', '🚣', '🎯', '🏆']
		},
		{
			label: 'Animals',
			emojis: ['🐕', '🐈', '🦁', '🐻', '🦅', '🦈', '🐙', '🦄', '🐝', '🦋', '🐢', '🦖']
		},
		{
			label: 'Food & Drink',
			emojis: ['🍺', '🍕', '🌮', '🍔', '☕', '🧁', '🍩', '🌶️', '🥑', '🍣', '🥨', '🧀']
		},
		{
			label: 'Objects & Symbols',
			emojis: ['🔥', '⚡', '💪', '🎸', '🎲', '🗿', '💎', '🛸', '🌈', '☠️', '🏴‍☠️', '⚔️']
		}
	]

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return

		uploading = true

		try {
			// Resize to 64x64 WebP using Canvas
			const bitmap = await createImageBitmap(file)
			const canvas = new OffscreenCanvas(64, 64)
			const ctx = canvas.getContext('2d')!
			ctx.drawImage(bitmap, 0, 0, 64, 64)
			const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })

			// Upload to Supabase Storage
			const { createBrowserClient } = await import('@supabase/ssr')
			const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } = await import(
				'$env/static/public'
			)
			const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY)

			const path = `${userId}/avatar.webp`
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(path, blob, { upsert: true, contentType: 'image/webp' })

			if (uploadError) throw uploadError

			const {
				data: { publicUrl }
			} = supabase.storage.from('avatars').getPublicUrl(path)

			// Add cache-buster to force browser to reload the new image
			avatarUrl = `${publicUrl}?t=${Date.now()}`
			avatarEmoji = null
		} catch (err) {
			console.error('Upload failed:', err)
		} finally {
			uploading = false
		}
	}

	function selectEmoji(emoji: string) {
		avatarEmoji = emoji
		avatarUrl = null
	}
</script>

<div class="space-y-4">
	<!-- Preview -->
	<div class="flex justify-center">
		<Avatar profile={previewProfile} size="lg" />
	</div>

	<!-- Tab switcher -->
	<div class="flex justify-center gap-2">
		<button
			type="button"
			onclick={() => (tab = 'photo')}
			class="rounded px-3 py-1.5 text-sm {tab === 'photo'
				? 'bg-blue-600 text-white'
				: 'bg-gray-800 text-gray-400'}"
		>
			Upload photo
		</button>
		<button
			type="button"
			onclick={() => (tab = 'emoji')}
			class="rounded px-3 py-1.5 text-sm {tab === 'emoji'
				? 'bg-blue-600 text-white'
				: 'bg-gray-800 text-gray-400'}"
		>
			Pick an emoji
		</button>
	</div>

	{#if tab === 'photo'}
		<div class="flex justify-center">
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				onchange={handleFileSelect}
				class="hidden"
			/>
			<button
				type="button"
				disabled={uploading}
				onclick={() => fileInput.click()}
				class="rounded-md bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
			>
				{uploading ? 'Uploading...' : 'Choose photo'}
			</button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each emojiGroups as group}
				<div>
					<p class="mb-1 text-xs text-gray-500">{group.label}</p>
					<div class="flex flex-wrap gap-1">
						{#each group.emojis as emoji}
							<button
								type="button"
								onclick={() => selectEmoji(emoji)}
								class="rounded p-1.5 text-xl transition hover:bg-gray-700 {avatarEmoji ===
								emoji
									? 'bg-blue-600/30 ring-1 ring-blue-500'
									: ''}"
							>
								{emoji}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Hidden inputs for form submission -->
	<input type="hidden" name="avatar_url" value={avatarUrl ?? ''} />
	<input type="hidden" name="avatar_emoji" value={avatarEmoji ?? ''} />
</div>
