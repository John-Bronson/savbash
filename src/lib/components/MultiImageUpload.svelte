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
		status: 'queued' | 'uploading' | 'done' | 'error';
		progress: number;
		url: string | null;
		preview: string | null;
	};

	let files = $state<FileEntry[]>([]);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let currentIndex = $state(0);
	let totalInBatch = $state(0);

	const allDone = $derived(
		files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error')
	);
	const uploading = $derived(files.some((f) => f.status === 'uploading' || f.status === 'queued'));

	async function resizeAndUpload(file: File, entry: FileEntry) {
		try {
			entry.status = 'uploading';
			entry.progress = 0;

			const bitmap = await createImageBitmap(file);
			const scale = Math.min(1, maxWidth / bitmap.width);
			const w = Math.round(bitmap.width * scale);
			const h = Math.round(bitmap.height * scale);
			const canvas = new OffscreenCanvas(w, h);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0, w, h);
			const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });

			entry.progress = 0.3;

			const { createBrowserClient } = await import('@supabase/ssr');
			const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
				await import('$env/static/public');
			const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

			const path = `${pathPrefix}${entry.id}.webp`;

			const uploadPromise = supabase.storage
				.from(bucket)
				.upload(path, blob, { upsert: true, contentType: 'image/webp' });

			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('Upload timed out after 30s')), 30000)
			);

			const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

			if (uploadError) throw uploadError;

			const {
				data: { publicUrl }
			} = supabase.storage.from(bucket).getPublicUrl(path);

			entry.url = `${publicUrl}?t=${Date.now()}`;
			entry.progress = 1;
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
		const fileMap = new Map<string, File>();

		for (const file of fileList) {
			if (!file.type.startsWith('image/')) continue;
			const id = crypto.randomUUID();
			const preview = URL.createObjectURL(file);
			const entry: FileEntry = {
				id,
				name: file.name,
				status: 'queued',
				progress: 0,
				url: null,
				preview
			};
			newEntries.push(entry);
			fileMap.set(id, file);
			files = [...files, entry];
		}

		totalInBatch = newEntries.length;

		for (let i = 0; i < newEntries.length; i++) {
			currentIndex = i + 1;
			const entry = newEntries[i];
			const file = fileMap.get(entry.id)!;
			await resizeAndUpload(file, entry);
		}
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

	function queuePosition(file: FileEntry): number {
		const queued = files.filter((f) => f.status === 'queued');
		return queued.indexOf(file) + 1;
	}

	function ringOffset(progress: number): number {
		const circumference = 2 * Math.PI * 18;
		return circumference * (1 - progress);
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
							class="h-full w-full object-cover {file.status === 'uploading' || file.status === 'queued' ? 'opacity-50' : ''}"
						/>
					{/if}
					{#if file.status === 'uploading'}
						<div class="absolute inset-0 flex items-center justify-center bg-black/40">
							<svg class="h-12 w-12" viewBox="0 0 40 40">
								<circle
									cx="20"
									cy="20"
									r="18"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									class="text-gray-700"
								/>
								<circle
									cx="20"
									cy="20"
									r="18"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-dasharray={2 * Math.PI * 18}
									stroke-dashoffset={ringOffset(file.progress)}
									stroke-linecap="round"
									transform="rotate(-90 20 20)"
									class="text-blue-400 transition-[stroke-dashoffset] duration-300"
								/>
								<text
									x="20"
									y="21"
									text-anchor="middle"
									dominant-baseline="middle"
									fill="currentColor"
									class="text-[9px] font-medium text-gray-200"
								>
									{currentIndex}/{totalInBatch}
								</text>
							</svg>
						</div>
					{:else if file.status === 'queued'}
						<div class="absolute inset-0 flex items-center justify-center bg-black/40">
							<span class="text-lg font-semibold text-gray-300">{queuePosition(file)}</span>
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
				Uploading {currentIndex} of {totalInBatch}...
			{:else if files.length > 0}
				+ Add more photos
			{:else}
				Drop photos or tap to select
			{/if}
		</span>
	</label>

	<input type="hidden" name="photo_urls" value={JSON.stringify(values)} />
</div>
