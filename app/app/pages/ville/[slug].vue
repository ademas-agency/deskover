<script setup lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const route = useRoute()
const slug = route.params.slug as string
const { getByCity, getCities } = usePlaces()

const { data: asyncData, status } = await useAsyncData(
  `ville-${slug}`,
  async () => {
    const [cities, placesResult] = await Promise.all([getCities(), getByCity(slug)])
    return { city: cities.find((c: any) => c.slug === slug) || null, places: placesResult }
  }
)
const places = computed(() => asyncData.value?.places || [])
const city = computed(() => asyncData.value?.city || null)
const loading = computed(() => status.value === 'pending')

function categoryLabel(cat: string) {
  switch (cat) {
    case 'cafe': return 'Café'
    case 'coffee_shop': return 'Coffee Shop'
    case 'coworking': return 'Coworking'
    case 'tiers_lieu': return 'Tiers-lieu'
    default: return cat
  }
}

const cityName = computed(() => {
  if (city.value) return city.value.name
  if (slug.startsWith('paris-')) {
    return 'Paris ' + slug.replace('paris-', '').replace('e', 'ᵉ')
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
})

const articleSlug = computed(() => `travailler-${slug}`)

const categoryColors: Record<string, string> = {
  cafe: '#AA4C4D',
  coffee_shop: '#8B3A3B',
  coworking: '#5B7A5E',
  tiers_lieu: '#D4A84B',
  library: '#6B5B4E'
}

const mapContainer = ref<HTMLElement | null>(null)
const selectedPlace = ref<any>(null)
const showCard = ref(false)
const photoSlider = ref<HTMLElement | null>(null)
const currentPhotoIdx = ref(0)
const router = useRouter()

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

function selectPlace(place: any, map: maplibregl.Map) {
  selectedPlace.value = place
  showCard.value = true
  currentPhotoIdx.value = 0
  map.flyTo({ center: [place.longitude, place.latitude], zoom: 15, duration: 600 })
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
    router.push(`/lieu/${selectedPlace.value.id}`)
  }
}

onMounted(() => {
  if (!mapContainer.value || !places.value.length) return

  const withCoords = places.value.filter(p => p.latitude && p.longitude)
  if (!withCoords.length) return

  const lngs = withCoords.map(p => p.longitude)
  const lats = withCoords.map(p => p.latitude)
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

  const map = new maplibregl.Map({
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
      layers: [{ id: 'carto', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 20 }]
    },
    center: [centerLng, centerLat],
    zoom: 14,
    attributionControl: false
  })

  map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

  map.on('load', () => {
    withCoords.forEach(p => {
      const color = categoryColors[p.category] || '#AA4C4D'
      const el = document.createElement('div')
      el.style.cursor = 'pointer'

      if (p.photoUrl) {
        el.innerHTML = `<div style="width:44px;height:56px;border-radius:8px;overflow:hidden;border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.2);background:${color};">
          <img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">${p.name.charAt(0)}</div>
        </div>`
      } else {
        el.innerHTML = `<div style="width:44px;height:56px;border-radius:8px;border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.2);background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">
          ${p.name.charAt(0)}
        </div>`
      }

      el.addEventListener('click', () => {
        selectPlace(p, map)
      })

      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map)
    })

    if (withCoords.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      withCoords.forEach(p => bounds.extend([p.longitude, p.latitude]))
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 })
    }
  })
})

useHead({
  title: () => `Où travailler à ${cityName.value} - Deskover`,
  meta: [
    { name: 'description', content: () => `Les meilleurs cafés, coworkings et spots pour bosser à ${cityName.value}. WiFi, prises, ambiance - tout est noté.` },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">

    <!-- Header mobile -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center lg:hidden">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <!-- Map hero -->
    <div class="relative h-[320px] lg:h-[480px]">
      <div ref="mapContainer" class="w-full h-full rounded-b-[24px] lg:rounded-b-none overflow-hidden" />

      <!-- Top bar overlay (desktop) -->
      <div class="hidden lg:block absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div class="flex items-center justify-between px-10 pt-6 lg:container-deskover pointer-events-auto">
          <NuxtLink to="/" class="font-display text-base text-[var(--color-espresso)] tracking-[0.15em]">DESKOVER</NuxtLink>
          <NuxtLink to="/search">
            <UIcon name="lucide:search" class="w-[22px] h-[22px] text-[var(--color-espresso)]" />
          </NuxtLink>
        </div>
      </div>

      <!-- Selected place card -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-full opacity-0"
      >
        <div v-if="showCard && selectedPlace" class="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:w-[400px] z-20">
          <div class="bg-white rounded-[20px] shadow-2xl overflow-hidden relative cursor-pointer" @click="goToPlace">
            <!-- Photo slider -->
            <div class="h-[140px] relative overflow-hidden">
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
                  <img :src="photo" :alt="selectedPlace.name" class="w-full h-full object-cover">
                </div>
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              <!-- Arrows -->
              <template v-if="selectedPlacePhotos.length > 1">
                <button
                  class="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors"
                  @click.stop="currentPhotoIdx = (currentPhotoIdx - 1 + selectedPlacePhotos.length) % selectedPlacePhotos.length; photoSlider?.scrollTo({ left: currentPhotoIdx * photoSlider!.clientWidth, behavior: 'smooth' })"
                >
                  <UIcon name="lucide:chevron-left" class="w-4 h-4 text-white" />
                </button>
                <button
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors"
                  @click.stop="currentPhotoIdx = (currentPhotoIdx + 1) % selectedPlacePhotos.length; photoSlider?.scrollTo({ left: currentPhotoIdx * photoSlider!.clientWidth, behavior: 'smooth' })"
                >
                  <UIcon name="lucide:chevron-right" class="w-4 h-4 text-white" />
                </button>
              </template>
              <!-- Dots -->
              <div v-if="selectedPlacePhotos.length > 1" class="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                <span
                  v-for="(_, idx) in selectedPlacePhotos"
                  :key="idx"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="idx === currentPhotoIdx ? 'bg-white' : 'bg-white/50'"
                />
              </div>
              <div class="absolute bottom-2 left-4 right-4 pointer-events-none">
                <div class="font-display text-lg text-white leading-tight">{{ selectedPlace.name }}</div>
                <div class="text-[11px] text-white/80 mt-0.5">{{ categoryLabel(selectedPlace.category) }} · {{ selectedPlace.city }}</div>
              </div>
            </div>
            <!-- Vitals -->
            <div class="p-3">
              <PlaceVitals :vitals="selectedPlace.vitals" size="sm" />
            </div>
            <!-- Close -->
            <button class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center" @click.stop="closeCard">
              <UIcon name="lucide:x" class="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Contenu -->
    <div class="lg:container-deskover lg:mt-8">

      <!-- Chapeau -->
      <div class="px-5 pt-6 pb-4 lg:px-0">
        <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2">
          {{ places.length }} spots
        </div>
        <h1 class="font-display text-[26px] lg:text-[36px] text-[var(--color-espresso)] leading-[1.1]">
          Où travailler à {{ cityName }}
        </h1>
        <p class="text-[14px] text-[var(--color-roast)] mt-2 leading-relaxed">
          Les meilleurs cafés, coworkings et tiers-lieux pour bosser à {{ cityName }}.
        </p>
      </div>

      <!-- Lien vers l'article -->
      <div class="px-5 mb-4 lg:px-0">
        <NuxtLink
          :to="`/articles/${articleSlug}`"
          class="flex items-center justify-between bg-[var(--color-linen)] px-4 py-3.5 rounded-[14px]"
        >
          <div>
            <div class="text-[10px] font-bold uppercase text-[var(--color-terracotta-500)] tracking-wide">Guide complet</div>
            <div class="text-[13px] font-semibold text-[var(--color-espresso)] mt-0.5">Lire notre article sur {{ cityName }}</div>
          </div>
          <UIcon name="lucide:arrow-right" class="w-[18px] h-[18px] text-[var(--color-terracotta-500)]" />
        </NuxtLink>
      </div>

      <!-- Liste des lieux -->
      <div class="px-5 pb-24 lg:px-0">
        <div v-if="loading" class="text-center py-12">
          <div class="w-8 h-8 border-3 border-[var(--color-terracotta-500)] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>

        <div v-else class="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="(place, i) in places"
            :key="place.id"
            :to="`/lieu/${place.id}`"
            class="block"
          >
            <PlaceCard
              :place="{
                name: place.name,
                type: categoryLabel(place.category),
                neighborhood: '',
                city: place.address || place.city,
                distance: '',
                isOpen: place.isOpen ?? true,
                nextOpen: place.nextOpen,
                tag: i === 0 ? 'Deskovered #1' : i === 1 ? 'Deskovered #2' : i === 2 ? 'Deskovered #3' : undefined,
                image: place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop',
                images: place.photos || [],
                vitals: place.vitals,
              }"
            />
          </NuxtLink>
        </div>
      </div>

    </div>

    <FabCarte />
    <DeskoverFooter />
  </div>
</template>
