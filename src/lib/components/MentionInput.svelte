<script lang="ts">
	import { tick } from 'svelte';

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

	const MENTION_RE = /@(\w[\w\s]*?)(?=\s@|$|\s(?![\w])|\.|,|!|\?)/g;

	type Segment = { type: 'text'; content: string } | { type: 'mention'; mentionName: string };

	function parseSegments(text: string): Segment[] {
		const segments: Segment[] = [];
		let lastIndex = 0;
		for (const match of text.matchAll(MENTION_RE)) {
			const idx = match.index!;
			if (idx > lastIndex) {
				segments.push({ type: 'text', content: text.slice(lastIndex, idx) });
			}
			segments.push({ type: 'mention', mentionName: match[1] });
			lastIndex = idx + match[0].length;
		}
		if (lastIndex < text.length) {
			segments.push({ type: 'text', content: text.slice(lastIndex) });
		}
		return segments;
	}

	function serializeSegments(segments: Segment[]): string {
		return segments.map((s) => (s.type === 'mention' ? `@${s.mentionName}` : s.content)).join('');
	}

	let editor: HTMLDivElement;
	let showDropdown = $state(false);
	let mentionQuery = $state('');
	let mentionStart = $state(0); // character offset in plaintext where @ begins
	let selectedIndex = $state(0);
	let composing = $state(false);
	let plainValue = $state(value);

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

	function createMentionSpan(mentionName: string): HTMLSpanElement {
		const span = document.createElement('span');
		span.contentEditable = 'false';
		span.setAttribute('data-mention', '');
		span.setAttribute('data-mention-name', mentionName);
		span.className = 'rounded bg-blue-600/30 px-1 font-medium text-blue-300';
		span.textContent = `@${mentionName}`;
		return span;
	}

	function renderToDOM() {
		if (!editor) return;
		const segments = parseSegments(plainValue);
		editor.innerHTML = '';
		for (const seg of segments) {
			if (seg.type === 'text') {
				// Split by newlines to insert <br> elements
				const parts = seg.content.split('\n');
				for (let i = 0; i < parts.length; i++) {
					if (i > 0) editor.appendChild(document.createElement('br'));
					if (parts[i]) editor.appendChild(document.createTextNode(parts[i]));
				}
			} else {
				editor.appendChild(createMentionSpan(seg.mentionName));
			}
		}
		// Ensure there's at least an empty text node so cursor can be placed
		if (editor.childNodes.length === 0) {
			editor.appendChild(document.createTextNode(''));
		}
	}

	function readFromDOM(): Segment[] {
		const segments: Segment[] = [];

		function walk(node: Node) {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent || '';
				if (text) segments.push({ type: 'text', content: text });
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.hasAttribute('data-mention')) {
					const mentionName = el.getAttribute('data-mention-name') || '';
					segments.push({ type: 'mention', mentionName });
				} else if (el.tagName === 'BR') {
					segments.push({ type: 'text', content: '\n' });
				} else {
					// Browser may wrap lines in <div>s
					if (el.tagName === 'DIV' && el !== editor && el.previousSibling) {
						segments.push({ type: 'text', content: '\n' });
					}
					for (const child of el.childNodes) {
						walk(child);
					}
				}
			}
		}

		for (const child of editor.childNodes) {
			walk(child);
		}
		return segments;
	}

	function getTextBeforeCursor(): string | null {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return null;
		const range = sel.getRangeAt(0);
		if (!editor.contains(range.startContainer)) return null;

		const preRange = document.createRange();
		preRange.selectNodeContents(editor);
		preRange.setEnd(range.startContainer, range.startOffset);

		// Walk the nodes in preRange to build text
		const fragment = preRange.cloneContents();
		return extractText(fragment);
	}

	function extractText(node: Node): string {
		let text = '';
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent || '';
		}
		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			if (el.hasAttribute?.('data-mention')) {
				return `@${el.getAttribute('data-mention-name') || ''}`;
			}
			if (el.tagName === 'BR') return '\n';
		}
		for (const child of node.childNodes) {
			text += extractText(child);
		}
		return text;
	}

	function handleInput() {
		if (composing) return;
		const segments = readFromDOM();
		plainValue = serializeSegments(segments);
		value = plainValue;

		// Clean up empty state for placeholder
		if (!plainValue && editor.innerHTML !== '') {
			editor.innerHTML = '';
		}

		detectMention();
	}

	function detectMention() {
		const textBefore = getTextBeforeCursor();
		if (textBefore === null) {
			showDropdown = false;
			return;
		}

		const atIndex = textBefore.lastIndexOf('@');
		if (
			atIndex >= 0 &&
			(atIndex === 0 || textBefore[atIndex - 1] === ' ' || textBefore[atIndex - 1] === '\n')
		) {
			const query = textBefore.slice(atIndex + 1);
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

	function getMentionSpanBeforeCursor(): HTMLSpanElement | null {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return null;
		const range = sel.getRangeAt(0);
		if (!range.collapsed) return null;

		const container = range.startContainer;
		const offset = range.startOffset;

		// Case 1: cursor is in a text node at offset 0, check previous sibling
		if (container.nodeType === Node.TEXT_NODE && offset === 0) {
			const prev = container.previousSibling;
			if (prev && prev.nodeType === Node.ELEMENT_NODE) {
				const el = prev as HTMLElement;
				if (el.hasAttribute('data-mention')) return el;
			}
		}

		// Case 2: cursor is between child nodes of the editor
		if (container === editor && offset > 0) {
			const prev = container.childNodes[offset - 1];
			if (prev && prev.nodeType === Node.ELEMENT_NODE) {
				const el = prev as HTMLElement;
				if (el.hasAttribute('data-mention')) return el;
			}
		}

		return null;
	}

	function getMentionSpanAfterCursor(): HTMLSpanElement | null {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return null;
		const range = sel.getRangeAt(0);
		if (!range.collapsed) return null;

		const container = range.startContainer;
		const offset = range.startOffset;

		// Case 1: cursor is at end of text node, check next sibling
		if (container.nodeType === Node.TEXT_NODE && offset === (container.textContent?.length || 0)) {
			const next = container.nextSibling;
			if (next && next.nodeType === Node.ELEMENT_NODE) {
				const el = next as HTMLElement;
				if (el.hasAttribute('data-mention')) return el;
			}
		}

		// Case 2: cursor is between child nodes of the editor
		if (container === editor && offset < container.childNodes.length) {
			const next = container.childNodes[offset];
			if (next && next.nodeType === Node.ELEMENT_NODE) {
				const el = next as HTMLElement;
				if (el.hasAttribute('data-mention')) return el;
			}
		}

		return null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (showDropdown) {
			const items = filtered();
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
				return;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				return;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				if (items.length > 0) {
					e.preventDefault();
					insertMention(items[selectedIndex].display);
					return;
				}
			} else if (e.key === 'Escape') {
				showDropdown = false;
				return;
			}
		}

		// Enter without dropdown inserts newline (default contenteditable behavior)
		// but we might want to submit on Enter without shift — keep existing behavior:
		// the parent form handles submit via button, so Enter in contenteditable is fine

		if (e.key === 'Backspace') {
			const span = getMentionSpanBeforeCursor();
			if (span) {
				e.preventDefault();
				span.remove();
				handleInput();
				return;
			}
		}

		if (e.key === 'Delete') {
			const span = getMentionSpanAfterCursor();
			if (span) {
				e.preventDefault();
				span.remove();
				handleInput();
				return;
			}
		}
	}

	function insertMention(display: string) {
		// We need to find and replace the @query text with a mention span
		const textBefore = getTextBeforeCursor();
		if (textBefore === null) return;

		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		// Find the @ in the DOM by walking backwards from cursor
		const cursorRange = sel.getRangeAt(0);
		const container = cursorRange.startContainer;
		const offset = cursorRange.startOffset;

		// The @ and query text should be in a text node
		if (container.nodeType === Node.TEXT_NODE) {
			const text = container.textContent || '';
			// Find the @ position relative to this text node
			const queryLen = mentionQuery.length + 1; // +1 for @
			const atPos = offset - queryLen;

			if (atPos >= 0 && text[atPos] === '@') {
				const before = text.slice(0, atPos);
				const after = text.slice(offset);

				const mentionSpan = createMentionSpan(display);
				const afterNode = document.createTextNode(after ? ` ${after}` : '\u00A0');
				const parentNode = container.parentNode!;

				if (before) {
					container.textContent = before;
					parentNode.insertBefore(mentionSpan, container.nextSibling);
					parentNode.insertBefore(afterNode, mentionSpan.nextSibling);
				} else {
					parentNode.insertBefore(mentionSpan, container);
					parentNode.insertBefore(afterNode, mentionSpan.nextSibling);
					parentNode.removeChild(container);
				}

				// Place cursor after the space
				const range = document.createRange();
				range.setStart(afterNode, 1);
				range.collapse(true);
				sel.removeAllRanges();
				sel.addRange(range);
			}
		}

		showDropdown = false;
		handleInput();
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') || '';
		document.execCommand('insertText', false, text);
	}

	// Sync external value changes (e.g., form reset clearing commentBody)
	let lastExternalValue = value;
	$effect(() => {
		const current = value;
		if (current !== plainValue) {
			plainValue = current;
			lastExternalValue = current;
			tick().then(() => {
				renderToDOM();
			});
		}
	});

	// Initial render
	$effect(() => {
		if (editor) {
			renderToDOM();
			// Only run once on mount
			return;
		}
	});
</script>

<div class="relative">
	<input type="hidden" {name} value={plainValue} />
	<div
		bind:this={editor}
		contenteditable="true"
		role="textbox"
		tabindex="0"
		aria-multiline="true"
		data-placeholder={placeholder}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onpaste={handlePaste}
		oncompositionstart={() => (composing = true)}
		oncompositionend={() => {
			composing = false;
			handleInput();
		}}
		onblur={() => {
			setTimeout(() => {
				showDropdown = false;
			}, 200);
		}}
		class="mention-editor block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		style="min-height: {rows *
			1.5}em; max-height: 12em; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;"
	></div>

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

<style>
	.mention-editor:empty::before {
		content: attr(data-placeholder);
		color: #6b7280;
		pointer-events: none;
	}

	.mention-editor:focus {
		outline: none;
	}
</style>
