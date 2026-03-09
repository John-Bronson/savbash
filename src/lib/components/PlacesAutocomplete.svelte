<script lang="ts">
	import { onMount } from 'svelte'
	import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public'

	let {
		nameValue = $bindable(''),
		latValue = $bindable<number | null>(null),
		lngValue = $bindable<number | null>(null)
	}: {
		nameValue: string
		latValue: number | null
		lngValue: number | null
	} = $props()

	let input: HTMLInputElement

	onMount(() => {
		if (!PUBLIC_GOOGLE_MAPS_API_KEY) return

		const script = document.createElement('script')
		script.src = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
		script.async = true
		script.onload = () => {
			// @ts-expect-error — google.maps loaded dynamically via script tag
			const autocomplete = new google.maps.places.Autocomplete(input, {
				fields: ['name', 'formatted_address', 'geometry']
			})
			autocomplete.addListener('place_changed', () => {
				const place = autocomplete.getPlace()
				if (place.geometry?.location) {
					nameValue = place.name || place.formatted_address || ''
					latValue = place.geometry.location.lat()
					lngValue = place.geometry.location.lng()
				}
			})
		}
		document.head.appendChild(script)

		return () => {
			script.remove()
		}
	})
</script>

<div>
	<input
		bind:this={input}
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
