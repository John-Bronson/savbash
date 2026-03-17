<script lang="ts">
	let {
		bucket,
		pathPrefix,
		maxWidth = 1200,
		values = $bindable<string[]>([])
	}: {
		bucket: string;
		pathPrefix: string;
		maxWidth?: number;
		values: string[];
	} = $props();

	type FileEntry = {
		id: string;
		name: string;
		status: 'uploading' | 'done' | 'error';
		url: string | null;
		preview: string | null;
	};

	let files = $state<FileEntry[]>([]);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const allDone = $derived(files.length > 0 && files.every((f) => f.status !== 'uploading'));
	const uploading = $derived(files.some((f) => f.status === 'uploading'));

	async function resizeAndUpload(file: File, entry: FileEntry) {
		try {
			const bitmap = await createImageBitmap(file);
			const scale = Math.min(1, maxWidth / bitmap.width);
			const w = Math.round(bitmap.width * scale);
			const h = Math.round(bitmap.height * scale);
			const canvas = new OffscreenCanvas(w, h);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0, w, h);
			const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });

			const { createBrowserClient } = await import('@supabase/ssr');
			const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
				await import('$env/static/public');
			const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

			const path = `${pathPrefix}${entry.id}.webp`;
			const { error: uploadError } = await supabase.storage
				.from(bucket)
				.upload(path, blob, { upsert: true, contentType: 'image/webp' });

			if (uploadError) throw uploadError;

			const {
				data: { publicUrl }
			} = supabase.storage.from(bucket).getPublicUrl(path);

			entry.url = `${publicUrl}?t=${Date.now()}`;
			entry.status = 'done';
		} catch (err) {
			console.error('Upload failed:', err);
			entry.status = 'error';
		}
		syncValues();
	}

	function syncValues() {
		values = files.filter((f) => f.status === 'done' && f.url).map((f) => f.url!);
	}

	async function processFiles(fileList: FileList) {
		const newEntries: FileEntry[] = [];
		for (const file of fileList) {
			if (!file.type.startsWith('image/')) continue;
			const id = crypto.randomUUID();
			const preview = URL.createObjectURL(file);
			const entry: FileEntry = { id, name: file.name, status: 'uploading', url: null, preview };
			newEntries.push(entry);
			files = [...files, entry];
		}

		// Process with concurrency limit of 3
		const queue = [...newEntries];
		const fileMap = new Map<string, File>();
		let idx = 0;
		for (const file of fileList) {
			if (!file.type.startsWith('image/')) continue;
			fileMap.set(newEntries[idx].id, file);
			idx++;
		}

		const workers: Promise<void>[] = [];
		let queueIdx = 0;

		async function worker() {
			while (queueIdx < queue.length) {
				const current = queue[queueIdx++];
				const file = fileMap.get(current.id)!;
				await resizeAndUpload(file, current);
			}
		}

		const concurrency = Math.min(3, queue.length);
		for (let i = 0; i < concurrency; i++) {
			workers.push(worker());
		}
		await Promise.all(workers);
	}

	function onFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			processFiles(input.files);
			input.value = '';
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			processFiles(e.dataTransfer.files);
		}
	}

	function removeFile(id: string) {
		const entry = files.find((f) => f.id === id);
		if (entry?.preview) URL.revokeObjectURL(entry.preview);
		files = files.filter((f) => f.id !== id);
		syncValues();
	}
</script>

<div>
	{#if files.length > 0}
		<div class="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
			{#each files as file}
				<div class="relative aspect-square overflow-hidden rounded-lg bg-gray-800">
					{#if file.preview}
						<img
							src={file.preview}
							alt={file.name}
							class="h-full w-full object-cover {file.status === 'uploading' ? 'opacity-50' : ''}"
						/>
					{/if}
					{#if file.status === 'uploading'}
						<div class="absolute inset-0 flex items-center justify-center bg-black/40">
							<div
								class="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-white"
							></div>
						</div>
					{:else if file.status === 'error'}
						<div class="absolute inset-0 flex items-center justify-center bg-red-900/40">
							<span class="text-xs text-red-300">Failed</span>
						</div>
					{/if}
					<button
						type="button"
						onclick={() => removeFile(file.id)}
						class="absolute top-1 right-1 rounded-full bg-gray-900/80 px-1.5 py-0.5 text-xs text-gray-300 hover:bg-gray-900"
					>
						&times;
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<label
		class="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-4 text-sm transition {dragOver
			? 'border-blue-500 bg-blue-900/20'
			: 'border-gray-700 hover:border-gray-600'}"
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={() => {
			dragOver = false;
		}}
		ondrop={onDrop}
	>
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			multiple
			onchange={onFileInput}
			class="hidden"
		/>
		<span class="text-gray-400">
			{#if uploading}
				Uploading...
			{:else if files.length > 0}
				+ Add more photos
			{:else}
				Drop photos or tap to select
			{/if}
		</span>
	</label>

	<input type="hidden" name="photo_urls" value={JSON.stringify(values)} />
</div>
