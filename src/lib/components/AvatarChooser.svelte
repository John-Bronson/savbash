<script lang="ts">
	import Avatar from './Avatar.svelte';

	let {
		avatarUrl = $bindable<string | null>(null),
		avatarEmoji = $bindable<string | null>(null),
		christianName = '',
		bashName = '',
		userId
	}: {
		avatarUrl: string | null;
		avatarEmoji: string | null;
		christianName: string;
		bashName: string;
		userId: string;
	} = $props();

	import emojiData from 'unicode-emoji-json';

	let tab = $state<'photo' | 'emoji'>(avatarEmoji ? 'emoji' : 'photo');
	let uploading = $state(false);
	let fileInput: HTMLInputElement;
	let search = $state('');

	const previewProfile = $derived({
		christian_name: christianName,
		bash_name: bashName,
		avatar_url: avatarUrl,
		avatar_emoji: avatarEmoji
	});

	const allEmojis = Object.entries(emojiData).map(([emoji, data]) => ({
		emoji,
		name: data.name,
		group: data.group
	}));

	const groupOrder = [
		'Smileys & Emotion',
		'People & Body',
		'Animals & Nature',
		'Food & Drink',
		'Travel & Places',
		'Activities',
		'Objects',
		'Symbols',
		'Flags'
	];

	const emojiGroups = $derived.by(() => {
		const term = search.toLowerCase().trim();
		const filtered = term ? allEmojis.filter((e) => e.name.includes(term)) : allEmojis;

		const grouped: Record<string, { emoji: string; name: string }[]> = {};
		for (const e of filtered) {
			(grouped[e.group] ??= []).push(e);
		}

		return groupOrder
			.filter((g) => g in grouped)
			.map((g) => ({ label: g, emojis: grouped[g] }));
	});

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;

		try {
			// Resize to 64x64 WebP using Canvas
			const bitmap = await createImageBitmap(file);
			const canvas = new OffscreenCanvas(64, 64);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0, 64, 64);
			const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });

			// Upload to Supabase Storage
			const { createBrowserClient } = await import('@supabase/ssr');
			const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
				await import('$env/static/public');
			const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

			const path = `${userId}/avatar.webp`;
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(path, blob, { upsert: true, contentType: 'image/webp' });

			if (uploadError) throw uploadError;

			const {
				data: { publicUrl }
			} = supabase.storage.from('avatars').getPublicUrl(path);

			// Add cache-buster to force browser to reload the new image
			avatarUrl = `${publicUrl}?t=${Date.now()}`;
			avatarEmoji = null;
		} catch (err) {
			console.error('Upload failed:', err);
		} finally {
			uploading = false;
		}
	}

	function selectEmoji(emoji: string) {
		avatarEmoji = emoji;
		avatarUrl = null;
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
			<input
				type="text"
				bind:value={search}
				placeholder="Search emojis..."
				class="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
			<div class="max-h-64 space-y-3 overflow-y-auto">
				{#each emojiGroups as group (group.label)}
					<div>
						<p class="sticky top-0 mb-1 bg-gray-950 py-1 text-xs text-gray-500">
							{group.label}
						</p>
						<div class="flex flex-wrap gap-1">
							{#each group.emojis as e (e.emoji)}
								<button
									type="button"
									onclick={() => selectEmoji(e.emoji)}
									title={e.name}
									class="rounded p-1.5 text-xl transition hover:bg-gray-700 {avatarEmoji === e.emoji
										? 'bg-blue-600/30 ring-1 ring-blue-500'
										: ''}"
								>
									{e.emoji}
								</button>
							{/each}
						</div>
					</div>
				{/each}
				{#if emojiGroups.length === 0}
					<p class="py-4 text-center text-sm text-gray-500">No emojis found</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Hidden inputs for form submission -->
	<input type="hidden" name="avatar_url" value={avatarUrl ?? ''} />
	<input type="hidden" name="avatar_emoji" value={avatarEmoji ?? ''} />
</div>
