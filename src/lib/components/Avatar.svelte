<script lang="ts">
	type AvatarProfile = {
		christian_name?: string | null;
		bash_name?: string | null;
		avatar_url?: string | null;
		avatar_emoji?: string | null;
	};

	let { profile, size = 'md' }: { profile: AvatarProfile | null; size?: 'sm' | 'md' | 'lg' } =
		$props();

	const sizeClasses: Record<string, string> = {
		sm: 'h-8 w-8',
		md: 'h-10 w-10',
		lg: 'h-16 w-16'
	};

	const emojiSizeClasses: Record<string, string> = {
		sm: 'text-3xl',
		md: 'text-4xl',
		lg: 'text-6xl'
	};

	const initialsSizeClasses: Record<string, string> = {
		sm: 'text-xs',
		md: 'text-sm',
		lg: 'text-xl'
	};

	// Deterministic color from name
	const colors = [
		'bg-red-800',
		'bg-orange-800',
		'bg-amber-800',
		'bg-yellow-800',
		'bg-lime-800',
		'bg-green-800',
		'bg-emerald-800',
		'bg-teal-800',
		'bg-cyan-800',
		'bg-sky-800',
		'bg-blue-800',
		'bg-indigo-800',
		'bg-violet-800',
		'bg-purple-800',
		'bg-fuchsia-800',
		'bg-pink-800',
		'bg-rose-800'
	];

	const displayName = $derived(profile?.bash_name || profile?.christian_name || '?');

	const initials = $derived(
		displayName
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	);

	const colorIndex = $derived(
		displayName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
	);
</script>

{#if profile?.avatar_url}
	<!-- Photo avatar -->
	<div class="relative shrink-0 {sizeClasses[size]}">
		<img
			src={profile.avatar_url}
			alt={displayName}
			class="rounded-full object-cover {sizeClasses[size]}"
		/>
	</div>
{:else if profile?.avatar_emoji}
	<!-- Emoji avatar — oversized -->
	<div
		class="relative flex shrink-0 items-center justify-center overflow-visible rounded-full bg-gray-800 {sizeClasses[
			size
		]}"
	>
		<span class="leading-none {emojiSizeClasses[size]}">{profile.avatar_emoji}</span>
	</div>
{:else}
	<!-- Initials fallback -->
	<div
		class="flex shrink-0 items-center justify-center rounded-full {colors[colorIndex]} {sizeClasses[
			size
		]}"
	>
		<span class="font-medium text-white {initialsSizeClasses[size]}">{initials}</span>
	</div>
{/if}
