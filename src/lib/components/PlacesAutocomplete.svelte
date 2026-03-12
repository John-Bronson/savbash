<script lang="ts">
	import { onMount } from 'svelte';

	let {
		nameValue = $bindable(''),
		latValue = $bindable<number | null>(null),
		lngValue = $bindable<number | null>(null),
		apiKey = ''
	}: {
		nameValue: string;
		latValue: number | null;
		lngValue: number | null;
		apiKey?: string;
	} = $props();

	let autocompleteWrapperEl: HTMLDivElement;
	let mapEl: HTMLDivElement;
	let map: google.maps.Map | null = null;
	let marker: google.maps.marker.AdvancedMarkerElement | null = null;
	let apiLoaded = $state(false);

	function updateMarker(lat: number, lng: number) {
		const pos = { lat, lng };
		if (map && marker) {
			marker.position = pos;
			map.panTo(pos);
		}
	}

	async function initMap() {
		if (!mapEl || !apiLoaded) return;
		const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
		const { AdvancedMarkerElement } = (await google.maps.importLibrary(
			'marker'
		)) as google.maps.MarkerLibrary;

		const center = latValue && lngValue ? { lat: latValue, lng: lngValue } : { lat: 0, lng: 0 };
		const zoom = latValue && lngValue ? 15 : 2;

		map = new Map(mapEl, {
			center,
			zoom,
			disableDefaultUI: true,
			zoomControl: true,
			mapId: 'savbash-dark',
			colorScheme: google.maps.ColorScheme.DARK
		});

		marker = new AdvancedMarkerElement({
			map,
			position: latValue && lngValue ? center : undefined,
			gmpDraggable: true
		});

		marker.addListener('dragend', () => {
			const pos = marker!.position as google.maps.LatLngLiteral;
			if (pos) {
				latValue = pos.lat;
				lngValue = pos.lng;
			}
		});

		map.addListener('click', (e: google.maps.MapMouseEvent) => {
			if (e.latLng) {
				latValue = e.latLng.lat();
				lngValue = e.latLng.lng();
				marker!.position = e.latLng;
			}
		});
	}

	async function initAutocomplete() {
		if (!autocompleteWrapperEl || !apiLoaded) return;
		await google.maps.importLibrary('places');

		const autocomplete = new google.maps.places.PlaceAutocompleteElement({});
		autocompleteWrapperEl.appendChild(autocomplete);

		// Style the inner input to match our theme
		autocomplete.style.width = '100%';

		autocomplete.addEventListener('gmp-select', async (e: any) => {
			const place = e.placePrediction.toPlace();
			await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

			if (place.location) {
				nameValue = place.displayName || place.formattedAddress || nameValue;
				latValue = place.location.lat();
				lngValue = place.location.lng();
				if (marker) {
					marker.position = place.location;
				}
				if (map) {
					map.panTo(place.location);
					map.setZoom(15);
				}
			}
		});
	}

	onMount(() => {
		if (!apiKey) return;

		// Check if already loaded
		if ((window as any).google?.maps) {
			apiLoaded = true;
			initAutocomplete();
			initMap();
			return;
		}

		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`;
		script.async = true;
		script.onload = () => {
			apiLoaded = true;
			initAutocomplete();
			initMap();
		};
		document.head.appendChild(script);
	});

	$effect(() => {
		if (latValue && lngValue && map && marker) {
			updateMarker(latValue, lngValue);
		}
	});
</script>

<div>
	{#if apiKey}
		<div bind:this={autocompleteWrapperEl} class="mt-1"></div>
		<input type="hidden" name="meeting_spot_name" value={nameValue} />
	{:else}
		<input
			bind:value={nameValue}
			id="meeting_spot_name"
			name="meeting_spot_name"
			type="text"
			required
			placeholder="e.g. Starbucks on Main St"
			class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		/>
	{/if}
	{#if apiKey && apiLoaded}
		<div
			bind:this={mapEl}
			class="mt-2 h-[150px] w-full overflow-hidden rounded-md border border-gray-700"
		></div>
		<p class="mt-1 text-xs text-gray-500">Click map or drag pin to fine-tune location</p>
	{:else if apiKey && !apiLoaded}
		<div
			bind:this={mapEl}
			class="mt-2 flex h-[150px] w-full items-center justify-center rounded-md border border-gray-700 bg-gray-800"
		>
			<span class="text-xs text-gray-500">Loading map...</span>
		</div>
	{/if}
	<input type="hidden" name="meeting_spot_lat" value={latValue ?? ''} />
	<input type="hidden" name="meeting_spot_lng" value={lngValue ?? ''} />
</div>
