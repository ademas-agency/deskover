<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Place } from '~/domain/models/Place'

const { public: { mapboxToken } } = useRuntimeConfig()

useSeoMeta({
  title: 'Carte des spots — Deskover',
  ogTitle: 'Carte des spots — Deskover',
  description: 'Explore la carte de tous les cafés, coworkings et tiers-lieux pour travailler en France. Trouve le spot le plus proche.',
  ogDescription: 'Tous les spots pour bosser en France sur une carte interactive.',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://www.deskover.fr/carte' }
  ]
})

const { getAllForMap } = usePlaces()
const router = useRouter()

const mapContainer = ref<HTMLElement | null>(null)
const { data: placesData } = await useAsyncData('carte-places', () => getAllForMap())
const places = computed(() => placesData.value || [])
const selectedPlace = ref<Place | null>(null)
const showCard = ref(false)
const photoSlider = ref<HTMLElement | null>(null)
const currentPhotoIdx = ref(0)
let map: mapboxgl.Map | null = null
const placeMarkers: Map<string, mapboxgl.Marker> = new Map()

const STORAGE_BASE = 'https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos'
const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=300&fit=crop'

const selectedPlacePhotos = computed(() => {
  if (!selectedPlace.value) return [FALLBACK_PHOTO]
  const photos: string[] = []
  if (selectedPlace.value.photoUrl) photos.push(selectedPlace.value.photoUrl)
  if (selectedPlace.value.photos?.length) {
    for (const p of selectedPlace.value.photos) {
      if (!photos.includes(p)) photos.push(p)
    }
  }
  return photos.length > 0 ? photos : [FALLBACK_PHOTO]
})

const mapFilters = ref([
  { label: 'Meilleur WiFi', value: 'wifi', icon: 'lucide:wifi', active: false },
  { label: 'Ouvert maintenant', value: 'ouvert', icon: 'lucide:clock', active: false },
  { label: 'Bosser au calme', value: 'calme', icon: 'lucide:volume-x', active: false },
  { label: 'Terrasses', value: 'terrasse', icon: 'lucide:sun', active: false },
  { label: 'Bien manger', value: 'food', icon: 'lucide:utensils', active: false },
  { label: 'Coworkings', value: 'coworking', icon: 'lucide:building-2', active: false },
  { label: 'Cafés', value: 'cafe', icon: 'lucide:coffee', active: false },
  { label: 'Prises', value: 'prises', icon: 'lucide:zap', active: false },
])

function toggleMapFilter(value: string) {
  const f = mapFilters.value.find(x => x.value === value)
  if (f) f.active = !f.active
  applyMapFilters()
}

function getFilteredPlaces(): Place[] {
  const active = mapFilters.value.filter(f => f.active).map(f => f.value)
  if (active.length === 0) return places.value

  return places.value.filter(p => {
    for (const a of active) {
      if (a === 'cafe' && p.category !== 'cafe' && p.category !== 'coffee_shop') return false
      if (a === 'coworking' && p.category !== 'coworking') return false
      if (a === 'wifi' && !p.signals.includes('wifi')) return false
      if (a === 'prises' && !p.signals.includes('prises')) return false
      if (a === 'food' && !p.signals.includes('food')) return false
      if (a === 'calme' && !p.signals.includes('calme')) return false
      if (a === 'terrasse' && !p.signals.includes('terrasse')) return false
      if (a === 'ouvert' && !p.isOpen) return false
    }
    return true
  })
}

function buildGeoJSON(filteredPlaces: Place[]) {
  return {
    type: 'FeatureCollection' as const,
    features: filteredPlaces
      .filter(p => p.latitude != null && p.longitude != null && !isNaN(p.latitude) && !isNaN(p.longitude))
      .map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          category: p.category,
          color: categoryColors[p.category] || '#AA4C4D'
        }
      }))
  }
}

function setupClusterLayers() {
  if (!map) return

  map.addSource('places', {
    type: 'geojson',
    data: buildGeoJSON(places.value),
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50
  })

  // Cercles de clusters
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'places',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#AA4C4D',
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.9
    }
  })

  // Nombre dans les clusters
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'places',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 13,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular']
    },
    paint: {
      'text-color': '#fff'
    }
  })

  // Points individuels : markers HTML avec photo (invisible layer pour détection)
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'places',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': 0
    }
  })

  function updateMarkers() {
    if (!map) return
    const visibleIds = new Set<string>()

    // Get unclustered features currently visible
    const features = map.querySourceFeatures('places', { filter: ['!', ['has', 'point_count']] })

    for (const f of features) {
      const id = String(f.properties?.id)
      if (!id || id === 'undefined') continue
      visibleIds.add(id)

      if (!placeMarkers.has(id)) {
        const place = places.value.find(p => String(p.id) === id)
        if (!place) continue
        const color = categoryColors[place.category] || '#AA4C4D'
        const el = document.createElement('div')
        el.style.cursor = 'pointer'

        const thumb = place.thumbUrl || place.photoUrl
        if (thumb) {
          el.innerHTML = `<div style="width:44px;height:56px;border-radius:8px;overflow:hidden;border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.2);background:${color};">
            <img src="${thumb}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
            <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">${place.name.charAt(0)}</div>
          </div>`
        } else {
          el.innerHTML = `<div style="width:44px;height:56px;border-radius:8px;border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.2);background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">
            ${place.name.charAt(0)}
          </div>`
        }

        el.addEventListener('click', (evt) => {
          evt.stopPropagation()
          selectPlace(place)
        })

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map!)

        placeMarkers.set(id, marker)
      }
    }

    // Remove markers that are now clustered
    for (const [id, marker] of placeMarkers) {
      if (!visibleIds.has(id)) {
        marker.remove()
        placeMarkers.delete(id)
      }
    }
  }

  map.on('render', updateMarkers)

  // Click sur cluster
  map.on('click', 'clusters', (e) => {
    const features = map!.queryRenderedFeatures(e.point, { layers: ['clusters'] })
    if (!features.length) return
    const clusterId = features[0].properties?.cluster_id
    if (clusterId == null) return
    const coords = (features[0].geometry as GeoJSON.Point).coordinates
    if (!coords || !isFinite(coords[0]) || !isFinite(coords[1])) return
    const currentZoom = map!.getZoom()
    map!.easeTo({ center: coords as [number, number], zoom: currentZoom + 2, duration: 500 })
  })
  map.on('click', 'cluster-count', (e) => {
    const features = map!.queryRenderedFeatures(e.point, { layers: ['clusters'] })
    if (!features.length) return
    const clusterId = features[0].properties?.cluster_id
    if (clusterId == null) return
    const coords = (features[0].geometry as GeoJSON.Point).coordinates
    if (!coords || !isFinite(coords[0]) || !isFinite(coords[1])) return
    const currentZoom = map!.getZoom()
    map!.easeTo({ center: coords as [number, number], zoom: currentZoom + 2, duration: 500 })
  })

  // Curseur pointer sur clusters
  map.on('mouseenter', 'clusters', () => { map!.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', 'clusters', () => { map!.getCanvas().style.cursor = '' })
}

function applyMapFilters() {
  if (!map) return
  // Clear all markers (they'll be recreated on next render)
  for (const [, marker] of placeMarkers) marker.remove()
  placeMarkers.clear()
  const source = map.getSource('places') as mapboxgl.GeoJSONSource
  if (source) {
    source.setData(buildGeoJSON(getFilteredPlaces()))
  }
}

const categoryColors: Record<string, string> = {
  cafe: '#AA4C4D',
  coffee_shop: '#8B3A3B',
  coworking: '#5B7A5E',
  tiers_lieu: '#D4A84B',
  library: '#6B5B4E'
}

function getPlacePhotos(place: Place): string[] {
  const photos: string[] = []
  if (place.photoUrl) photos.push(place.photoUrl)
  if (place.photos?.length) {
    for (const p of place.photos) {
      if (!photos.includes(p)) photos.push(p)
    }
  }
  return photos.length > 0 ? photos : [FALLBACK_PHOTO]
}

function selectPlace(place: Place) {
  // Preload first photo before showing the card
  const photos = getPlacePhotos(place)
  const img = new Image()
  img.src = photos[0]

  const show = () => {
    selectedPlace.value = place
    showCard.value = true
    currentPhotoIdx.value = 0
    if (map) {
      map.easeTo({ center: [place.longitude, place.latitude], zoom: 15, duration: 600 })
    }
    nextTick(() => {
      if (photoSlider.value) {
        photoSlider.value.scrollLeft = 0
        photoSlider.value.onscroll = () => {
          const w = photoSlider.value!.clientWidth
          if (w > 0) currentPhotoIdx.value = Math.round(photoSlider.value!.scrollLeft / w)
        }
      }
    })
  }

  if (img.complete) {
    show()
  } else {
    img.onload = show
    img.onerror = show // show anyway if image fails
  }
}

function closeCard() {
  showCard.value = false
  selectedPlace.value = null
}

function goToPlace() {
  if (selectedPlace.value) {
    router.push(`/lieu/${selectedPlace.value.slug || selectedPlace.value.id}?from=carte`)
  }
}

onMounted(() => {
  if (!mapContainer.value) return

  // Wait for container to have dimensions before creating map
  requestAnimationFrame(async () => {
    if (!mapContainer.value) return

    // Get user location first, fallback to Paris
    let center: [number, number] = [2.352, 48.856]
    let zoom = 12

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      })
      const lng = pos.coords.longitude
      const lat = pos.coords.latitude
      if (isFinite(lng) && isFinite(lat)) {
        center = [lng, lat]
        zoom = 14
      }
    }
    catch {
      // Fallback to Paris
    }

    mapboxgl.accessToken = mapboxToken
    map = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom,
      attributionControl: false,
      projection: 'mercator'
    })

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }), 'bottom-right')

    // Suppress known mapbox-gl v3 NaN LngLat rendering bug
    map.on('error', (e) => {
      if (e.error?.message?.includes('Invalid LngLat')) return
      console.error(e.error)
    })

    map.on('load', () => {
      setupClusterLayers()
    })
  })
})

onUnmounted(() => {
  if (map) map.remove()
})

function categoryLabel(cat: string) {
  switch (cat) {
    case 'cafe': return 'Café'
    case 'coffee_shop': return 'Coffee Shop'
    case 'coworking': return 'Coworking'
    case 'tiers_lieu': return 'Tiers-lieu'
    case 'library': return 'Bibliothèque'
    default: return cat
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-[var(--color-cream)]">
    <!-- Map -->
    <div ref="mapContainer" class="w-full h-full" />

    <!-- Back button (mobile: chevron) -->
    <NuxtLink
      to="/"
      class="absolute top-safe left-4 z-10 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center lg:hidden"
    >
      <UIcon name="lucide:chevron-left" class="w-5 h-5 text-[var(--color-espresso)]" />
    </NuxtLink>

    <!-- Close button (desktop: croix) -->
    <NuxtLink
      to="/"
      class="hidden lg:flex absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white shadow-lg items-center justify-center"
    >
      <UIcon name="lucide:x" class="w-5 h-5 text-[var(--color-espresso)]" />
    </NuxtLink>

    <!-- Filters bar -->
    <div class="absolute top-safe left-16 right-0 lg:top-4 lg:left-4 lg:right-16 z-10 flex gap-2 overflow-x-auto no-scrollbar pr-4 lg:pr-0">
      <button
        v-for="f in mapFilters"
        :key="f.value"
        class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-200 whitespace-nowrap border shadow-sm"
        :class="f.active ? 'bg-[var(--color-espresso)] text-white border-[var(--color-espresso)] shadow-[0_2px_8px_rgba(44,40,37,0.2)]' : 'bg-white text-[var(--color-roast)] border-[var(--color-parchment)]'"
        @click="toggleMapFilter(f.value)"
      >
        <UIcon :name="f.icon" class="w-4 h-4" />
        {{ f.label }}
      </button>
    </div>

    <!-- Selected place card (bottom sheet style) -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div v-if="showCard && selectedPlace" class="absolute bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-[400px] z-20">
        <div class="relative" @click="goToPlace">
          <PlaceCard
            :place="{
              name: selectedPlace.name,
              type: categoryLabel(selectedPlace.category),
              neighborhood: '',
              city: selectedPlace.city,
              distance: '',
              isOpen: selectedPlace.isOpen ?? true,
              nextOpen: selectedPlace.nextOpen,
              image: selectedPlace.cardUrl || selectedPlace.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop',
              images: selectedPlace.photos || [],
              vitals: selectedPlace.vitals,
            }"
          />
          <!-- Close -->
          <button class="absolute top-3 right-14 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center z-10" @click.stop="closeCard">
            <UIcon name="lucide:x" class="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
