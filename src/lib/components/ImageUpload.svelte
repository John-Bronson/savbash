<script lang="ts">
	let {
		bucket,
		path,
		maxWidth = 1200,
		value = $bindable<string | null>(null),
		label = 'Upload image',
		preview = true
	}: {
		bucket: string;
		path: string;
		maxWidth?: number;
		value: string | null;
		label?: string;
		preview?: boolean;
	} = $props();

	let uploading = $state(false);
	let dragOver = $state(false);

	async function handleFile(file: File) {
		if (!file.type.startsWith('image/')) return;
		uploading = true;

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

			const { error: uploadError } = await supabase.storage
				.from(bucket)
				.upload(path, blob, { upsert: true, contentType: 'image/webp' });

			if (uploadError) throw uploadError;

			const {
				data: { publicUrl }
			} = supabase.storage.from(bucket).getPublicUrl(path);

			value = `${publicUrl}?t=${Date.now()}`;
		} catch (err) {
			console.error('Upload failed:', err);
		} finally {
			uploading = false;
		}
	}

	function onFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) handleFile(input.files[0]);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
	}

	function remove() {
		value = null;
	}
</script>

<div>
	{#if value && preview}
		<div class="relative mb-2">
			<img
				src={value}
				alt="Upload preview"
				class="w-full rounded-lg object-cover"
				style="max-height: 200px"
			/>
			<button
				type="button"
				onclick={remove}
				class="absolute top-2 right-2 rounded-full bg-gray-900/80 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-900"
			>
				Remove
			</button>
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
		<input type="file" accept="image/*" onchange={onFileInput} class="hidden" />
		<span class="text-gray-400">
			{#if uploading}
				Uploading...
			{:else}
				{label}
			{/if}
		</span>
	</label>

	<input type="hidden" name="image_url" value={value ?? ''} />
</div>
