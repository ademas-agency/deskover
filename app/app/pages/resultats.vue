<script setup lang="ts">
import type { PlaceFilters } from '~/domain/models/Place'

const route = useRoute()
const router = useRouter()
const { getAll, getByCity, getCities, getNearby } = usePlaces()
const client = useSupabaseClient()

// --- Read query params ---
const searchQuery = computed(() => (route.query.q as string) || '')
const searchLat = computed(() => route.query.lat ? parseFloat(route.query.lat as string) : null)
const searchLng = computed(() => route.query.lng ? parseFloat(route.query.lng as string) : null)
const searchPostcode = computed(() => (route.query.cp as string) || '')

const searchFilters = computed<PlaceFilters>(() => {
  const f: PlaceFilters = {}
  if (route.query.wifi) f.wifi = true
  if (route.query.prises) f.prises = true
  if (route.query.food) f.food = true
  if (route.query.style) f.style = true
  if (route.query.type) f.category = route.query.type as string
  if (route.query.access === 'free') f.gratuit = true
  return f
})

const isOpenOnly = computed(() => !!route.query.open)

const hasFilters = computed(() => {
  const f = searchFilters.value
  return !!(f.wifi || f.prises || f.food || f.style || f.category || f.gratuit || isOpenOnly.value)
})

// --- Active filter chips ---
const activeChips = computed(() => {
  const chips: { key: string; label: string; icon: string }[] = []
  if (isOpenOnly.value) chips.push({ key: 'open', label: 'Ouvert maintenant', icon: 'lucide:clock' })
  if (searchFilters.value.wifi) chips.push({ key: 'wifi', label: 'WiFi', icon: 'lucide:wifi' })
  if (searchFilters.value.prises) chips.push({ key: 'prises', label: 'Prises', icon: 'lucide:zap' })
  if (searchFilters.value.food) chips.push({ key: 'food', label: 'Food', icon: 'lucide:utensils' })
  if (searchFilters.value.style) chips.push({ key: 'style', label: 'Style', icon: 'lucide:sparkles' })
  if (searchFilters.value.category) {
    const labels: Record<string, string> = { cafe: 'Cafe', coffee_shop: 'Coffee Shop', coworking: 'Coworking', tiers_lieu: 'Tiers-lieu' }
    chips.push({ key: 'type', label: labels[searchFilters.value.category] || searchFilters.value.category, icon: 'lucide:building-2' })
  }
  if (searchFilters.value.gratuit) chips.push({ key: 'access', label: 'Gratuit', icon: 'lucide:ticket' })
  return chips
})

function removeChip(key: string) {
  const q = { ...route.query }
  delete q[key]
  router.replace({ query: q })
}

// --- Resolve city slug from query ---
const { data: cities } = await useAsyncData('cities', () => getCities())

const citySlug = computed(() => {
  if (!searchQuery.value || !cities.value) return null
  const qNorm = normalize(searchQuery.value)
  const match = cities.value.find(c => normalize(c.name) === qNorm || c.slug === qNorm)
  return match?.slug || null
})

// --- Data fetching ---
// Strategy: if we match a city_key, use getByCity (returns ALL places in that city, no limit)
// Otherwise, fall back to getAll with text search
const { data: rawFiltered } = await useAsyncData(
  'resultats-filtered',
  async () => {
    if (citySlug.value) {
      return getByCity(citySlug.value, searchFilters.value)
    }
    // Fallback: getAll with query filter
    const filters = { ...searchFilters.value }
    if (searchQuery.value) filters.query = searchQuery.value
    return getAll(filters)
  },
  { watch: [searchFilters, citySlug] }
)

// Unfiltered fallback (for when filters reduce results too much)
const { data: rawAll } = await useAsyncData(
  'resultats-all',
  async () => {
    if (!hasFilters.value) return null
    if (citySlug.value) return getByCity(citySlug.value)
    return getAll({})
  },
  { watch: [searchFilters, isOpenOnly, citySlug] }
)

// --- Distance helpers ---
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}\u00A0m`
  return `${km.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u00A0km`
}

// --- Filter + proximity logic ---
const CITY_RADIUS_KM = 30
const EXPANDED_RADIUS_KM = 50
const filtersRelaxed = ref(false)
const expanded = ref(false)
const userExpanded = ref(false)
const expandedCoords = ref<{ lat: number; lng: number } | null>(null)
const expandedPlaces = ref<any[]>([])
const expanding = ref(false)
const { public: { mapboxToken } } = useRuntimeConfig()

async function expandSearch() {
  expanding.value = true
  try {
    // Get center coords: use searchLat/Lng if available, else geocode searchQuery via Mapbox
    let lat = searchLat.value
    let lng = searchLng.value
    if ((!lat || !lng) && searchQuery.value) {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.value)}.json?country=FR&access_token=${mapboxToken}&limit=1`)
      const data = await res.json()
      const feat = data.features?.[0]
      if (feat) {
        lng = feat.center[0]
        lat = feat.center[1]
      }
    }
    if (!lat || !lng) {
      expanding.value = false
      return
    }
    expandedCoords.value = { lat, lng }
    // Bounding-box fetch to get all places within the expanded radius
    const nearby = await getNearby(lat, lng, EXPANDED_RADIUS_KM, searchFilters.value)
    expandedPlaces.value = nearby
    userExpanded.value = true
  }
  finally {
    expanding.value = false
  }
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function enrichWithDistance(items: typeof rawFiltered.value) {
  if (!items) return []
  const hasGeo = !!(searchLat.value && searchLng.value)

  let enriched = items.map(p => ({
    ...p,
    _distKm: hasGeo ? haversineKm(searchLat.value!, searchLng.value!, p.latitude, p.longitude) : 0,
    distance: hasGeo ? formatDistance(haversineKm(searchLat.value!, searchLng.value!, p.latitude, p.longitude)) : '',
  }))

  // If we matched a city via city_key, no need to filter by distance — Supabase already filtered
  // If no city match and we have coords, filter by radius (elargi si "Élargir la recherche" cliqué)
  if (!citySlug.value && hasGeo) {
    const radius = userExpanded.value ? EXPANDED_RADIUS_KM : CITY_RADIUS_KM
    enriched = enriched.filter(p => p._distKm <= radius)
  }

  if (hasGeo) {
    enriched.sort((a, b) => a._distKm - b._distKm)
  }

  return enriched
}

const places = computed(() => {
  filtersRelaxed.value = false
  expanded.value = false

  // Expanded mode: user clicked "Élargir la recherche"
  if (userExpanded.value && expandedCoords.value) {
    const { lat, lng } = expandedCoords.value
    const refCity = searchQuery.value
    let results = expandedPlaces.value.map(p => {
      const dist = haversineKm(lat, lng, p.latitude, p.longitude)
      return {
        ...p,
        _distKm: dist,
        distance: refCity ? `${formatDistance(dist)} de ${refCity}` : formatDistance(dist)
      }
    })
    results = results.filter(p => p._distKm <= EXPANDED_RADIUS_KM)
    if (isOpenOnly.value) results = results.filter(p => p.isOpen !== false)
    results.sort((a, b) => a._distKm - b._distKm)
    return results
  }

  // Step 1: filter by proximity + Supabase filters
  let results = enrichWithDistance(rawFiltered.value)

  // Step 2: apply open filter
  if (isOpenOnly.value) {
    results = results.filter(p => p.isOpen !== false)
  }

  // Step 3: if < 10 results and we have filters, try without filters
  if (results.length < 10 && hasFilters.value && rawAll.value) {
    const allNearby = enrichWithDistance(rawAll.value)
    if (allNearby.length > results.length) {
      filtersRelaxed.value = true
      results = allNearby
    }
  }

  // Step 4: if still 0 and we had no geo initially, nothing more to do
  if (results.length === 0 && searchLat.value && searchLng.value) {
    expanded.value = true
  }

  return results
})

// --- Category label ---
function categoryLabel(cat: string) {
  switch (cat) {
    case 'cafe': return 'Café'
    case 'coffee_shop': return 'Coffee Shop'
    case 'coworking': return 'Coworking'
    case 'tiers_lieu': return 'Tiers-lieu'
    default: return cat
  }
}

// --- Notify me (empty state) ---
const notifyEmail = ref('')
const notifySubmitting = ref(false)
const requestSent = ref(false)
const emailSent = ref(false)
const showEmailField = ref(false)

function formatCriteria(): string {
  const parts: string[] = []
  if (isOpenOnly.value) parts.push('Ouvert maintenant')
  if (searchFilters.value.wifi) parts.push('WiFi')
  if (searchFilters.value.prises) parts.push('Prises')
  if (searchFilters.value.food) parts.push('Food')
  if (searchFilters.value.style) parts.push('Style')
  if (searchFilters.value.category) parts.push('Type\u00A0: ' + searchFilters.value.category)
  if (searchFilters.value.gratuit) parts.push('Gratuit')
  return parts.length ? parts.join(', ') : 'Aucun filtre'
}

function formatLocation(): string {
  const cp = searchPostcode.value
  return cp ? `${searchQuery.value} (${cp})` : searchQuery.value
}

async function submitRequest() {
  await client.from('messages').insert({
    name: `Demande\u00A0: ${formatLocation()}`,
    email: '',
    subject: `Demande de spots à ${formatLocation()}`,
    message: `${formatLocation()}\nFiltres\u00A0: ${formatCriteria()}`,
  })
  requestSent.value = true
}

async function submitEmail() {
  if (!notifyEmail.value.trim()) return
  await client.from('messages').insert({
    name: `Alerte\u00A0: ${formatLocation()}`,
    email: notifyEmail.value.trim(),
    subject: `Alerte spots à ${formatLocation()}`,
    message: `${formatLocation()}\nFiltres\u00A0: ${formatCriteria()}`,
  })
  emailSent.value = true
}

// --- City guide articles ---
const { data: cityArticles } = await useAsyncData(
  'resultats-articles',
  async () => {
    if (!citySlug.value) return []
    const { data } = await client
      .from('articles')
      .select('title, slug, city, cover_image, description')
      .eq('published', true)
      .eq('city_slug', citySlug.value)
      .order('published_at', { ascending: false })
      .limit(5)
    return data || []
  },
  { watch: [citySlug] }
)

// --- City guide article ("Où travailler à...") ---
const cityGuideArticle = computed(() => {
  if (!cityArticles.value?.length) return null
  return cityArticles.value.find(a => a.title?.toLowerCase().startsWith('où travailler')) || null
})

// --- Search link with current params ---
const searchLink = computed(() => {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(route.query)) {
    if (v) params.set(k, String(v))
  }
  const qs = params.toString()
  return `/search${qs ? '?' + qs : ''}`
})

// --- SEO ---
useSeoMeta({
  title: () => searchQuery.value ? `Spots à ${searchQuery.value} — Deskover` : 'Résultats — Deskover',
  description: () => `Trouve les meilleurs spots pour bosser à ${searchQuery.value || 'proximite'}. WiFi, prises, ambiance — tout est noté.`,
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)] pb-24 lg:pb-0">

    <!-- Header mobile -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 pt-safe lg:hidden">
      <div class="flex items-center gap-3">
        <NuxtLink :to="searchLink" class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center flex-shrink-0">
          <UIcon name="lucide:chevron-left" class="w-5 h-5 text-[var(--color-espresso)]" />
        </NuxtLink>
        <div class="flex-1 min-w-0">
          <h1 class="font-display text-[18px] text-[var(--color-espresso)] truncate">{{ searchQuery || 'Résultats' }}</h1>
          <p class="text-[12px] text-[var(--color-steam)]">
            <template v-if="userExpanded">
              {{ places.length }} lieu{{ places.length > 1 ? 'x' : '' }} à moins de 50 km{{ searchQuery ? ` de ${searchQuery}` : '' }}
            </template>
            <template v-else>
              {{ places.length }} lieu{{ places.length > 1 ? 'x' : '' }} trouvé{{ places.length > 1 ? 's' : '' }}
            </template>
          </p>
        </div>
        <NuxtLink :to="searchLink" class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center flex-shrink-0">
          <UIcon name="lucide:sliders-horizontal" class="w-5 h-5 text-[var(--color-espresso)]" />
        </NuxtLink>
      </div>
    </div>

    <!-- Header desktop -->
    <div class="hidden lg:block pt-8 lg:container-deskover">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <NuxtLink :to="searchLink" class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center">
            <UIcon name="lucide:chevron-left" class="w-5 h-5 text-[var(--color-espresso)]" />
          </NuxtLink>
          <div>
            <h1 class="font-display text-[28px] text-[var(--color-espresso)]">{{ searchQuery || 'Résultats' }}</h1>
            <p class="text-[13px] text-[var(--color-steam)] mt-0.5">
              <template v-if="userExpanded">
                {{ places.length }} lieu{{ places.length > 1 ? 'x' : '' }} à moins de 50 km{{ searchQuery ? ` de ${searchQuery}` : '' }}
              </template>
              <template v-else>
                {{ places.length }} lieu{{ places.length > 1 ? 'x' : '' }} trouvé{{ places.length > 1 ? 's' : '' }}
              </template>
            </p>
          </div>
        </div>
        <NuxtLink :to="searchLink" class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--color-linen)] text-[var(--color-espresso)] text-sm font-semibold hover:bg-[var(--color-parchment)] transition-colors">
          <UIcon name="lucide:sliders-horizontal" class="w-4 h-4" />
          Modifier la recherche
        </NuxtLink>
      </div>
    </div>

    <!-- City intro (from "Où travailler à..." article) -->
    <div v-if="cityGuideArticle?.description" class="px-5 pt-4 lg:container-deskover">
      <p class="text-[14px] text-[var(--color-roast)] leading-relaxed">{{ cityGuideArticle.description }}</p>
    </div>

    <!-- Active filter chips -->
    <div v-if="activeChips.length" class="px-5 pt-4 lg:container-deskover">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="chip in activeChips"
          :key="chip.key"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[var(--color-espresso)] text-white"
          @click="removeChip(chip.key)"
        >
          <UIcon :name="chip.icon" class="w-3.5 h-3.5" />
          {{ chip.label }}
          <UIcon name="lucide:x" class="w-3 h-3 ml-0.5 opacity-60" />
        </button>
      </div>
    </div>

    <!-- Bandeau filtres relaxes -->
    <div v-if="filtersRelaxed" class="px-5 pt-4 lg:container-deskover">
      <div class="bg-[var(--color-linen)] rounded-2xl px-4 py-3 flex items-start gap-3">
        <UIcon name="lucide:info" class="w-5 h-5 text-[var(--color-steam)] flex-shrink-0 mt-0.5" />
        <p class="text-[13px] text-[var(--color-roast)] leading-relaxed">
          Peu de résultats avec tes critères — on t'affiche tous les spots à proximité. Les filtres ne sont pas forcément respectés.
        </p>
      </div>
    </div>

    <!-- Results grid -->
    <div v-if="places.length" class="px-4 pt-5 flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:container-deskover">
      <NuxtLink
        v-for="place in places.slice(0, 30)"
        :key="place.id"
        :to="`/lieu/${place.slug || place.id}`"
        class="block h-full"
      >
        <PlaceCard :place="{
          name: place.name,
          type: categoryLabel(place.category),
          neighborhood: '',
          city: (place.address || place.city).replace(/,\s*France\s*$/i, ''),
          distance: place.distance || '',
          isOpen: place.isOpen ?? true,
          nextOpen: place.nextOpen,
          image: place.cardUrl || place.photoUrl || place.photos?.[0] || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
          images: place.photos || [],
          vitals: place.vitals
        }" />
      </NuxtLink>
    </div>

    <!-- City guide articles -->
    <div v-if="cityArticles?.length" class="px-4 mt-10 lg:container-deskover">
      <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.04em]">GUIDE {{ searchQuery.toUpperCase() }}</h2>
      <p class="text-[13px] text-[var(--color-roast)] mt-1.5 leading-relaxed mb-4">
        Nos articles pour bien bosser {{ searchQuery ? `à ${searchQuery}` : 'dans cette ville' }}.
      </p>
      <div class="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-4">
        <NuxtLink
          v-for="article in cityArticles"
          :key="article.slug"
          :to="`/articles/${article.slug}`"
          class="block relative rounded-2xl overflow-hidden h-[160px] shadow-[0_2px_12px_rgba(44,40,37,0.1)]"
        >
          <img :src="article.cover_image || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop'" :alt="article.title" class="absolute inset-0 w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 p-4">
            <div class="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-terracotta-300)] mb-1">{{ article.city?.toUpperCase() || 'GUIDE' }}</div>
            <div class="text-[14px] font-bold text-white leading-snug">{{ article.title }}</div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!places.length" class="px-5 pt-16 text-center lg:max-w-[500px] lg:mx-auto">
      <div class="w-20 h-20 rounded-full bg-[var(--color-linen)] flex items-center justify-center mx-auto">
        <UIcon name="lucide:map-pin-off" class="w-10 h-10 text-[var(--color-steam)]" />
      </div>
      <h2 class="font-display text-[20px] text-[var(--color-espresso)] mt-5">Pas encore de spot{{ searchQuery ? ` à ${searchQuery}` : '' }}</h2>

      <p v-if="!requestSent" class="text-[14px] text-[var(--color-roast)] mt-2 leading-relaxed">
        Clique ci-dessous pour qu'on en cherche pour toi.
      </p>

      <!-- Step 1: Send request -->
      <div v-if="!requestSent" class="mt-6">
        <button
          class="px-6 py-3.5 rounded-2xl text-sm font-bold bg-[var(--color-terracotta-500)] text-white shadow-[0_4px_16px_rgba(170,76,77,0.25)] active:scale-[0.98] transition-transform"
          @click="submitRequest"
        >
          <span class="flex items-center gap-2">
            <UIcon name="lucide:search" class="w-4 h-4" />
            Je cherche un spot{{ searchQuery ? ` à ${searchQuery}` : '' }}
          </span>
        </button>
      </div>

      <!-- Step 2: Request sent, show email field -->
      <div v-else-if="!emailSent" class="mt-6">
        <p class="text-[14px] text-[var(--color-roast)] mb-3 leading-relaxed">
          On lance les recherches. <br>On te prévient quand on a trouvé ?
        </p>
        <div class="flex gap-2 max-w-[360px] mx-auto">
          <input
            v-model="notifyEmail"
            type="email"
            placeholder="ton@email.com"
            class="flex-1 bg-white rounded-2xl px-4 py-3 text-[14px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none shadow-[0_2px_8px_rgba(44,40,37,0.06)] autofill:bg-white autofill:shadow-[inset_0_0_0px_1000px_white]"
          >
          <button
            class="px-5 py-3 rounded-2xl text-sm font-bold transition-all"
            :class="notifyEmail.trim() ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-[var(--color-parchment)] text-[var(--color-steam)]'"
            :disabled="!notifyEmail.trim()"
            @click="submitEmail"
          >
            OK
          </button>
        </div>
      </div>

      <!-- Step 3: Email sent -->
      <div v-else class="mt-6 flex items-center justify-center gap-2 text-[var(--color-monstera)]">
        <UIcon name="lucide:check-circle" class="w-5 h-5" />
        <span class="text-sm font-semibold">On te prévient dès qu'on a trouvé !</span>
      </div>

      <button
        v-if="!userExpanded"
        class="inline-block mt-8 text-sm font-semibold text-[var(--color-terracotta-500)] disabled:opacity-60"
        :disabled="expanding"
        @click="expandSearch"
      >
        {{ expanding ? 'Recherche…' : 'Élargir la recherche' }}
      </button>
    </div>

    <FabCarte />
    <DeskoverFooter class="mt-12" />
  </div>
</template>
