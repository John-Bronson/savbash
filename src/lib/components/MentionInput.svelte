<script lang="ts">
	let {
		value = $bindable(''),
		name = 'body',
		placeholder = '',
		members = [],
		rows = 2
	}: {
		value: string;
		name?: string;
		placeholder?: string;
		members: { id: string; christian_name: string; bash_name: string | null }[];
		rows?: number;
	} = $props();

	let textarea: HTMLTextAreaElement;
	let showDropdown = $state(false);
	let mentionQuery = $state('');
	let mentionStart = $state(0);
	let selectedIndex = $state(0);

	const filtered = $derived(() => {
		if (!mentionQuery)
			return [
				{ id: 'everyone', display: 'everyone', sub: 'Notify all RSVPs' },
				...members.map((m) => ({
					id: m.id,
					display: m.bash_name || m.christian_name,
					sub: m.bash_name ? m.christian_name : null
				}))
			];
		const q = mentionQuery.toLowerCase();
		const results: { id: string; display: string; sub: string | null }[] = [];
		if ('everyone'.startsWith(q)) {
			results.push({ id: 'everyone', display: 'everyone', sub: 'Notify all RSVPs' });
		}
		for (const m of members) {
			const display = m.bash_name || m.christian_name;
			if (
				display.toLowerCase().includes(q) ||
				m.christian_name.toLowerCase().includes(q) ||
				(m.bash_name && m.bash_name.toLowerCase().includes(q))
			) {
				results.push({ id: m.id, display, sub: m.bash_name ? m.christian_name : null });
			}
		}
		return results.slice(0, 8);
	});

	function onInput() {
		const pos = textarea.selectionStart;
		const text = value.slice(0, pos);
		const atIndex = text.lastIndexOf('@');

		if (
			atIndex >= 0 &&
			(atIndex === 0 || text[atIndex - 1] === ' ' || text[atIndex - 1] === '\n')
		) {
			const query = text.slice(atIndex + 1);
			if (!/\n/.test(query)) {
				mentionQuery = query;
				mentionStart = atIndex;
				showDropdown = true;
				selectedIndex = 0;
				return;
			}
		}
		showDropdown = false;
	}

	function insertMention(display: string) {
		const before = value.slice(0, mentionStart);
		const after = value.slice(textarea.selectionStart);
		value = `${before}@${display} ${after}`;
		showDropdown = false;
		// Focus back on textarea after inserting
		requestAnimationFrame(() => {
			const newPos = mentionStart + display.length + 2;
			textarea.focus();
			textarea.setSelectionRange(newPos, newPos);
		});
	}

	function onKeydown(e: KeyboardEvent) {
		if (!showDropdown) return;
		const items = filtered();
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			if (items.length > 0) {
				e.preventDefault();
				insertMention(items[selectedIndex].display);
			}
		} else if (e.key === 'Escape') {
			showDropdown = false;
		}
	}
</script>

<div class="relative">
	<textarea
		bind:this={textarea}
		bind:value
		{name}
		{rows}
		{placeholder}
		oninput={onInput}
		onkeydown={onKeydown}
		onblur={() => {
			setTimeout(() => {
				showDropdown = false;
			}, 200);
		}}
		class="block w-full rounded-md border-gray-700 bg-gray-800 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
	></textarea>

	{#if showDropdown && filtered().length > 0}
		<div
			class="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-lg"
		>
			{#each filtered() as item, i}
				<button
					type="button"
					onmousedown={(e) => {
						e.preventDefault();
						insertMention(item.display);
					}}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition {i ===
					selectedIndex
						? 'bg-blue-600/30 text-gray-100'
						: 'text-gray-300 hover:bg-gray-700'}"
				>
					<span class="font-medium">@{item.display}</span>
					{#if item.sub}
						<span class="text-xs text-gray-500">{item.sub}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
