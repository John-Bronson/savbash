<script lang="ts">
	let {
		nameValue = $bindable(''),
		latValue = $bindable<number | null>(null),
		lngValue = $bindable<number | null>(null)
	}: {
		nameValue: string;
		latValue: number | null;
		lngValue: number | null;
	} = $props();
</script>

<div>
	<input
		bind:value={nameValue}
		id="meeting_spot_name"
		name="meeting_spot_name"
		type="text"
		required
		placeholder="e.g. Starbucks on Main St"
		class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
	/>
	<input type="hidden" name="meeting_spot_lat" value={latValue ?? ''} />
	<input type="hidden" name="meeting_spot_lng" value={lngValue ?? ''} />
</div>
