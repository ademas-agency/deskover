<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { usePlacesStore } from '@/stores/places'
import { useRouter } from 'vue-router'
import { MapPin, Filter } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const store = usePlacesStore()
const router = useRouter()
const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let markerLayer: L.LayerGroup | null = null

const categoryFilter = ref('')
const categories = [
  { value: '', label: 'Toutes' },
  { value: 'cafe', label: 'Cafés' },
  { value: 'coffee_shop', label: 'Coffee Shops' },
  { value: 'coworking', label: 'Coworking' },
  { value: 'tiers_lieu', label: 'Tiers-lieux' }
]

const STORAGE_BASE = 'https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos'

const categoryColors: Record<string, string> = {
  cafe: '#AA4C4D',
  coffee_shop: '#8B3A3B',
  coworking: '#5B7A5E',
  tiers_lieu: '#D4A84B',
  library: '#6B5B4E'
}

function getPhotoUrl(place: any): string {
  if (place.photo_storage_path) return `${STORAGE_BASE}/${place.photo_storage_path}`
  if (place.photo_url) return place.photo_url
  return ''
}

const filteredPlaces = computed(() => {
  if (!store.places.length) return []
  const withCoords = store.places.filter(p => p.latitude && p.longitude)
  return categoryFilter.value
    ? withCoords.filter(p => p.category === categoryFilter.value)
    : withCoords
})

function updateMarkers() {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()

  filteredPlaces.value.forEach(place => {
    const color = categoryColors[place.category] || '#AA4C4D'
    const photo = getPhotoUrl(place)
    const size = 44

    const icon = L.divIcon({
      className: '',
      html: photo
        ? `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.25);overflow:hidden;background:${color};cursor:pointer;">
            <img src="${photo}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:700;\\'>${place.name.charAt(0)}</div>'" />
          </div>`
        : `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.25);background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:700;cursor:pointer;">
            ${place.name.charAt(0)}
          </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    })

    const marker = L.marker([place.latitude, place.longitude], { icon })
    marker.bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;">
        ${photo ? `<img src="${photo}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;">` : ''}
        <div style="font-weight:700;font-size:13px;color:#2C2825;">${place.name}</div>
        <div style="font-size:11px;color:#6B5B4E;margin-top:2px;">${place.city}${place.arrondissement ? ' ' + place.arrondissement + 'e' : ''}</div>
        <div style="font-size:10px;color:#A89888;margin-top:2px;">${place.category}</div>
      </div>
    `, { maxWidth: 250 })

    marker.on('dblclick', () => router.push(`/places/${place.id}`))

    markerLayer!.addLayer(marker)
  })
}

onMounted(async () => {
  if (!store.places.length) {
    await store.fetchPlaces()
  }

  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView([46.603354, 1.888334], 6)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)
  updateMarkers()
})

watch(categoryFilter, () => updateMarkers())
watch(() => store.places.length, () => updateMarkers())
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm">
        <Filter class="w-4 h-4 text-[#A89888]" />
        <select
          v-model="categoryFilter"
          class="bg-transparent border-none text-sm text-[#2C2825] font-medium focus:outline-none cursor-pointer"
        >
          <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
      </div>
      <span class="flex items-center gap-1.5 text-sm text-[#6B5B4E]">
        <MapPin class="w-4 h-4" />
        {{ filteredPlaces.length }} lieux
      </span>
    </div>

    <div class="flex items-center gap-4 mb-3 text-xs text-[#6B5B4E]">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#AA4C4D]"></span> Cafés</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#8B3A3B]"></span> Coffee Shops</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#5B7A5E]"></span> Coworking</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#D4A84B]"></span> Tiers-lieux</span>
    </div>

    <div ref="mapContainer" class="w-full rounded-2xl overflow-hidden shadow-sm" style="height: calc(100vh - 200px);"></div>
  </div>
</template>
