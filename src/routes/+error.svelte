<script lang="ts">
	import { page } from '$app/state'
</script>

<div class="flex min-h-[50vh] items-center justify-center">
	<div class="text-center">
		<p class="text-6xl font-bold text-gray-700">{page.status}</p>
		<p class="mt-4 text-lg text-gray-400">{page.error?.message || 'Something went wrong'}</p>
		<a href="/" class="mt-6 inline-block text-sm text-blue-400 hover:text-blue-300">
			&larr; Back to rides
		</a>
	</div>
</div>
