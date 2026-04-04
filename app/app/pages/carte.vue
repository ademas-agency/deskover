<script setup lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Place } from '~/domain/models/Place'

const { getAllForMap } = usePlaces()
const router = useRouter()

const mapContainer = ref<HTMLElement | null>(null)
const places = ref<Place[]>([])
const selectedPlace = ref<Place | null>(null)
const showCard = ref(false)
let map: maplibregl.Map | null = null

const mapFilters = ref([
  { label: 'WiFi', value: 'wifi', icon: 'lucide:wifi', active: false },
  { label: 'Prises', value: 'prises', icon: 'lucide:zap', active: false },
  { label: 'Food', value: 'food', icon: 'lucide:utensils', active: false },
  { label: 'Cafés', value: 'cafe', icon: 'lucide:coffee', active: false },
  { label: 'Coworking', value: 'coworking', icon: 'lucide:building-2', active: false },
  { label: 'Calme', value: 'calme', icon: 'lucide:ear', active: false },
])

function toggleMapFilter(value: string) {
  const f = mapFilters.value.find(x => x.value === value)
  if (f) f.active = !f.active
  applyMapFilters()
}

function applyMapFilters() {
  if (!map || !map.getSource('places')) return

  const active = mapFilters.value.filter(f => f.active).map(f => f.value)
  if (active.length === 0) {
    // No filter → show all
    map.setFilter('places-circles', null)
    return
  }

  // Build filter expression
  const conditions: any[] = ['all']
  for (const a of active) {
    if (['cafe', 'coffee_shop', 'coworking', 'tiers_lieu'].includes(a)) {
      conditions.push(['==', ['get', 'category'], a])
    }
  }
  // For vitals, we stored signals in properties
  if (active.includes('wifi')) conditions.push(['==', ['get', 'hasWifi'], true])
  if (active.includes('prises')) conditions.push(['==', ['get', 'hasPrises'], true])
  if (active.includes('food')) conditions.push(['==', ['get', 'hasFood'], true])
  if (active.includes('calme')) conditions.push(['==', ['get', 'hasCalme'], true])

  map.setFilter('places-circles', conditions.length > 1 ? conditions : null)
}

const categoryColors: Record<string, string> = {
  cafe: '#AA4C4D',
  coffee_shop: '#8B3A3B',
  coworking: '#5B7A5E',
  tiers_lieu: '#D4A84B',
  library: '#6B5B4E'
}

function selectPlace(place: Place) {
  selectedPlace.value = place
  showCard.value = true
  if (map) {
    map.flyTo({ center: [place.longitude, place.latitude], zoom: 15, duration: 600 })
  }
}

function closeCard() {
  showCard.value = false
  selectedPlace.value = null
}

function goToPlace() {
  if (selectedPlace.value) {
    router.push(`/lieu/${selectedPlace.value.id}`)
  }
}

onMounted(async () => {
  places.value = await getAllForMap()
  if (!mapContainer.value) return

  // Get user location first, fallback to Paris
  let center: [number, number] = [2.352, 48.856]
  let zoom = 12

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
    })
    center = [pos.coords.longitude, pos.coords.latitude]
    zoom = 14
  }
  catch {
    // Fallback to Paris
  }

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        carto: {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }
      },
      layers: [{
        id: 'carto',
        type: 'raster',
        source: 'carto',
        minzoom: 0,
        maxzoom: 20
      }]
    },
    center,
    zoom,
    attributionControl: false
  })

  map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
  map.addControl(new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true
  }), 'bottom-right')

  let selectedMarker: maplibregl.Marker | null = null

  map.on('load', () => {
    // GeoJSON source — all places
    const geojson = {
      type: 'FeatureCollection' as const,
      features: places.value
        .filter(p => p.latitude && p.longitude)
        .map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
          properties: {
            id: p.id,
            category: p.category,
            color: categoryColors[p.category] || '#AA4C4D',
            hasWifi: p.signals.includes('wifi'),
            hasPrises: p.signals.includes('prises'),
            hasFood: p.signals.includes('food'),
            hasCalme: p.signals.includes('calme')
          }
        }))
    }

    map!.addSource('places', { type: 'geojson', data: geojson })

    // WebGL circles — fast, no lag
    map!.addLayer({
      id: 'places-circles',
      type: 'circle',
      source: 'places',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 6, 16, 10],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9
      }
    })

    // Click → select place + show photo marker
    map!.on('click', 'places-circles', (e: any) => {
      if (e.features?.[0]) {
        const id = e.features[0].properties.id
        const place = places.value.find(p => p.id === id)
        if (place) {
          selectPlace(place)
          showPhotoMarker(place)
        }
      }
    })

    map!.on('mouseenter', 'places-circles', () => { map!.getCanvas().style.cursor = 'pointer' })
    map!.on('mouseleave', 'places-circles', () => { map!.getCanvas().style.cursor = '' })
  })

  function showPhotoMarker(place: Place) {
    // Remove previous
    if (selectedMarker) { selectedMarker.remove(); selectedMarker = null }

    const color = categoryColors[place.category] || '#AA4C4D'
    const el = document.createElement('div')
    el.innerHTML = place.photoUrl
      ? `<div style="width:52px;height:52px;border-radius:14px;overflow:hidden;border:3px solid ${color};box-shadow:0 4px 12px rgba(0,0,0,0.25);background:${color};"><img src="${place.photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block;"></div>`
      : `<div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.25);"></div>`

    selectedMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([place.longitude, place.latitude])
      .addTo(map!)
  }
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

    <!-- Back button -->
    <NuxtLink
      to="/"
      class="absolute top-[52px] left-4 z-10 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center"
    >
      <UIcon name="lucide:chevron-left" class="w-5 h-5 text-[var(--color-espresso)]" />
    </NuxtLink>

    <!-- Filters bar -->
    <div class="absolute top-[52px] left-16 right-4 z-10 flex gap-2 overflow-x-auto no-scrollbar">
      <button
        v-for="f in mapFilters"
        :key="f.value"
        class="flex-shrink-0 flex items-center gap-1.5 px-3.5 h-10 rounded-full text-[12px] font-semibold transition-all duration-200 whitespace-nowrap"
        :class="f.active ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-white text-[var(--color-espresso)]'"
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
      <div v-if="showCard && selectedPlace" class="absolute bottom-6 left-4 right-4 z-20">
        <div class="bg-white rounded-[20px] shadow-2xl overflow-hidden relative" @click="goToPlace">
          <!-- Photo banner -->
          <div class="h-[120px] relative overflow-hidden">
            <img
              :src="selectedPlace.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=300&fit=crop'"
              :alt="selectedPlace.name"
              class="w-full h-full object-cover"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div class="absolute bottom-3 left-4 right-4">
              <div class="font-display text-lg text-white leading-tight">{{ selectedPlace.name }}</div>
              <div class="text-[11px] text-white/80 mt-0.5">{{ categoryLabel(selectedPlace.category) }} · {{ selectedPlace.city }}</div>
            </div>
          </div>
          <!-- Vitals -->
          <div class="p-3">
            <PlaceVitals :vitals="selectedPlace.vitals" size="sm" />
          </div>
          <!-- Close -->
          <button class="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center" @click.stop="closeCard">
            <UIcon name="lucide:x" class="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
