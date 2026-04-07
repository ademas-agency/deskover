<script setup lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Place } from '~/domain/models/Place'

const { getAllForMap } = usePlaces()
const router = useRouter()

const mapContainer = ref<HTMLElement | null>(null)
const { data: placesData } = await useAsyncData('carte-places', () => getAllForMap())
const places = computed(() => placesData.value || [])
const selectedPlace = ref<Place | null>(null)
const showCard = ref(false)
const photoSlider = ref<HTMLElement | null>(null)
const currentPhotoIdx = ref(0)
let map: maplibregl.Map | null = null

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

const allMarkers: maplibregl.Marker[] = []
let selectedMarkerId: string | null = null

function createMarkers(filteredPlaces: Place[]) {
  if (!map) return
  // Remove old markers
  allMarkers.forEach(m => m.remove())
  allMarkers.length = 0

  filteredPlaces
    .filter(p => p.latitude && p.longitude)
    .forEach(p => {
      const color = categoryColors[p.category] || '#AA4C4D'
      const isSelected = p.id === selectedMarkerId
      const w = isSelected ? 56 : 44
      const h = isSelected ? 72 : 56
      const radius = 8

      const el = document.createElement('div')
      el.style.cursor = 'pointer'

      const thumb = p.thumbUrl || p.photoUrl
      if (thumb) {
        el.innerHTML = `<div style="width:${w}px;height:${h}px;border-radius:${radius}px;overflow:hidden;border:${isSelected ? 3 : 2}px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,${isSelected ? 0.4 : 0.2});background:${color};transition:all 0.15s;">
          <img src="${thumb}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">${p.name.charAt(0)}</div>
        </div>`
      } else {
        el.innerHTML = `<div style="width:${w}px;height:${h}px;border-radius:${radius}px;border:${isSelected ? 3 : 2}px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,${isSelected ? 0.4 : 0.2});background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;transition:all 0.15s;">
          ${p.name.charAt(0)}
        </div>`
      }

      el.addEventListener('click', () => {
        selectedMarkerId = p.id
        selectPlace(p)
        createMarkers(filteredPlaces)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map!)

      allMarkers.push(marker)
    })
}

function applyMapFilters() {
  if (!map) return
  createMarkers(getFilteredPlaces())
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
  currentPhotoIdx.value = 0
  if (map) {
    map.flyTo({ center: [place.longitude, place.latitude], zoom: 15, duration: 600 })
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

function closeCard() {
  showCard.value = false
  selectedPlace.value = null
}

function goToPlace() {
  if (selectedPlace.value) {
    router.push(`/lieu/${selectedPlace.value.slug || selectedPlace.value.id}?from=carte`)
  }
}

onMounted(async () => {
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

  // Also store source for filter logic
  map.on('load', () => {
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

    createMarkers(places.value)
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
        <div class="bg-white rounded-[20px] shadow-2xl overflow-hidden relative cursor-pointer" @click="goToPlace">
          <!-- Photo slider -->
          <div class="h-[180px] relative overflow-hidden">
            <div
              ref="photoSlider"
              class="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
              @click.stop
            >
              <div
                v-for="(photo, idx) in selectedPlacePhotos"
                :key="idx"
                class="w-full h-full flex-shrink-0 snap-center"
                @click="goToPlace"
              >
                <img
                  :src="photo"
                  :alt="selectedPlace.name"
                  class="w-full h-full object-cover"
                >
              </div>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            <!-- Carousel arrows -->
            <template v-if="selectedPlacePhotos.length > 1">
              <button
                class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors"
                @click.stop="currentPhotoIdx = (currentPhotoIdx - 1 + selectedPlacePhotos.length) % selectedPlacePhotos.length; photoSlider?.scrollTo({ left: currentPhotoIdx * photoSlider!.clientWidth, behavior: 'smooth' })"
              >
                <UIcon name="lucide:chevron-left" class="w-4 h-4 text-white" />
              </button>
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors"
                @click.stop="currentPhotoIdx = (currentPhotoIdx + 1) % selectedPlacePhotos.length; photoSlider?.scrollTo({ left: currentPhotoIdx * photoSlider!.clientWidth, behavior: 'smooth' })"
              >
                <UIcon name="lucide:chevron-right" class="w-4 h-4 text-white" />
              </button>
            </template>
            <!-- Dots indicator -->
            <div v-if="selectedPlacePhotos.length > 1" class="absolute bottom-12 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              <span
                v-for="(_, idx) in selectedPlacePhotos"
                :key="idx"
                class="w-1.5 h-1.5 rounded-full"
                :class="idx === currentPhotoIdx ? 'bg-white' : 'bg-white/50'"
              />
            </div>
            <div class="absolute bottom-3 left-4 right-4 pointer-events-none">
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
