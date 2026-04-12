<script setup lang="ts">
import type { PlaceFilters } from '~/domain/models/Place'

const { getAll, getNearby } = usePlaces()

// Quick filter cards — editorial picks that combine filter + sort
const quickFilters = [
  { key: 'recos', label: 'Nos recos', icon: 'lucide:sparkles', filter: {} as PlaceFilters, sort: 'relevance' as const },
  { key: 'proche', label: 'Les plus proches', icon: 'lucide:map-pin', filter: {} as PlaceFilters, sort: 'distance' as const },
  { key: 'ouvert', label: 'Ouvert maintenant', icon: 'lucide:clock', filter: {} as PlaceFilters, sort: 'relevance' as const, openOnly: true },
  { key: 'wifi', label: 'Meilleur WiFi', icon: 'lucide:wifi', filter: { wifi: true } as PlaceFilters, sort: 'wifi' as const },
  { key: 'calme', label: 'Bosser au calme', icon: 'lucide:volume-x', filter: { calme: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'terrasse', label: 'Terrasses', icon: 'lucide:sun', filter: { terrasse: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'gratuit', label: 'Gratuit', icon: 'lucide:ticket', filter: { gratuit: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'food', label: 'Bien manger', icon: 'lucide:utensils', filter: { food: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'coworking', label: 'Coworkings', icon: 'lucide:building-2', filter: { category: 'coworking' } as PlaceFilters, sort: 'relevance' as const },
  { key: 'cafe', label: 'Cafés', icon: 'lucide:coffee', filter: { category: 'cafe' } as PlaceFilters, sort: 'relevance' as const },
  { key: 'insolite', label: 'Insolite', icon: 'lucide:wand-2', filter: { insolite: true } as PlaceFilters, sort: 'relevance' as const },
]

const activeQuickFilter = ref('recos')
// Filtre affiché (titre + cards) : ne change qu'après le fetch des données
const displayFilter = ref('recos')
const showGeoModal = ref(false)
const showGeoHelp = ref(false)

// Détection OS/navigateur pour les instructions géoloc
const geoHelpOS = computed(() => {
  if (!import.meta.client) return 'unknown'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
})
const geoHelpBrowser = computed(() => {
  if (!import.meta.client) return 'unknown'
  const ua = navigator.userAgent
  if (/Firefox\//.test(ua)) return 'firefox'
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'chrome'
  if (/Safari\//.test(ua)) return 'safari'
  return 'unknown'
})

function setQuickFilter(key: string, evt?: MouseEvent) {
  // Si "proche" et pas de coords, vérifier la permission géoloc
  if (key === 'proche' && !userCoords.value) {
    tryGeolocOrShowModal()
    return
  }

  // Scroll the clicked pill into center BEFORE updating the active class
  // (avoids layout shift glitch from class change affecting scroll calc)
  const btn = evt?.currentTarget as HTMLElement | undefined
  if (btn) {
    const container = btn.parentElement
    if (container) {
      const target = btn.offsetLeft + btn.offsetWidth / 2 - container.clientWidth / 2
      container.scrollTo({ left: target, behavior: 'smooth' })
    }
  }

  activeQuickFilter.value = activeQuickFilter.value === key ? 'recos' : key
}

async function tryGeolocOrShowModal() {
  // Vérifier le statut de permission
  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      if (status.state === 'denied') {
        showGeoModal.value = true
        return
      }
    } catch { /* fallback: on essaie directement */ }
  }

  // Permission "prompt" ou inconnue : demander la géoloc
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        activeQuickFilter.value = 'proche'
      },
      () => {
        // Refusé ou erreur → afficher la modal
        showGeoModal.value = true
      },
      { timeout: 8000 }
    )
  } else {
    showGeoModal.value = true
  }
}

const currentFilter = computed(() => quickFilters.find(f => f.key === activeQuickFilter.value) || quickFilters[0])
const displayedFilter = computed(() => quickFilters.find(f => f.key === displayFilter.value) || quickFilters[0])

const pageTitle = computed(() => {
  switch (displayFilter.value) {
    case 'proche': return 'LES PLUS PROCHES'
    case 'wifi': return 'MEILLEUR WIFI'
    case 'calme': return 'BOSSER AU CALME'
    case 'terrasse': return 'TERRASSES'
    case 'gratuit': return 'ACCÈS GRATUIT'
    case 'food': return 'BIEN MANGER'
    case 'ouvert': return 'OUVERT MAINTENANT'
    case 'coworking': return 'COWORKINGS'
    case 'cafe': return 'CAFÉS'
    case 'insolite': return 'SPOTS INSOLITES'
    default: return 'NOS RECOS'
  }
})

const pageSubtitle = computed(() => {
  switch (displayFilter.value) {
    case 'recos': return userCity.value
      ? `Les pépites sélectionnées par Deskover autour de ${userCity.value}.`
      : 'Les pépites sélectionnées par Deskover.'
    case 'proche': return 'Pour ta réunion qui commence dans 10 minutes.'
    case 'wifi': return 'Du débit, du vrai.'
    case 'calme': return 'Zéro bruit de fond, concentration maximale.'
    case 'terrasse': return 'Aux beaux jours, on veut le combo boulot-soleil-café.'
    case 'gratuit': return 'Pose-toi, commande un café, c\'est tout.'
    case 'food': return 'Parce qu\'on bosse mieux le ventre plein.'
    case 'ouvert': return 'Tu peux y aller, ces spots sont ouverts en ce moment.'
    case 'coworking': return 'Des vrais espaces pensés pour bosser, avec tout ce qu\'il faut.'
    case 'cafe': return 'L\'art de poser son ordi entre deux expressos.'
    case 'insolite': return 'Des spots qui sortent du lot. Ça change.'
    default: return ''
  }
})

// Single fetch (top 100 curated, sans filtre) — tous les filtres sont appliqués
// client-side pour permettre la dédup "top 3 unique par filtre".
const { data: rawPlaces, status } = await useAsyncData(
  'home-places',
  () => getAll({}, 'relevance')
)
const loading = computed(() => status.value === 'pending')

// Sync displayFilter avec activeQuickFilter (filtre purement client-side)
watch(activeQuickFilter, (v) => {
  if (status.value === 'success') displayFilter.value = v
})
watch(status, (s) => {
  if (s === 'success') displayFilter.value = activeQuickFilter.value
})

// Matches a place against a filter's criteria (client-side)
function matchesFilter(p: any, key: string): boolean {
  const qf = quickFilters.find(x => x.key === key)
  const f = qf?.filter || {}
  if (qf?.openOnly && p.isOpen === false) return false
  if (f.wifi && !p.signals?.includes('wifi')) return false
  if (f.prises && !p.signals?.includes('prises')) return false
  if (f.food && !p.signals?.includes('food')) return false
  if (f.calme && !p.signals?.includes('calme')) return false
  if (f.terrasse && !p.signals?.includes('terrasse')) return false
  if (f.insolite && !p.signals?.includes('insolite')) return false
  if (f.gratuit && (p.signals?.includes('payant') || p.signals?.includes('reservation'))) return false
  if (f.category && p.category !== f.category) return false
  return true
}

// Top 3 unique par filtre : on parcourt les filtres dans un ordre de priorité,
// chacun s'attribue ses 3 meilleurs lieux disponibles (non claim par un filtre prioritaire).
// Map<placeId, filterKey> → ce lieu est top 3 de ce filtre.
const topClaims = computed(() => {
  const map = new Map<string, string>()
  if (!rawPlaces.value?.length) return map

  // Priorité : recos en premier (Deskovered #1/2/3), puis filtres "thématiques",
  // puis catégories. 'proche' n'apparaît pas car il a son propre dataset.
  const priority = ['recos', 'ouvert', 'wifi', 'calme', 'terrasse', 'food', 'coworking', 'cafe', 'gratuit', 'insolite']
  const claimed = new Set<string>()

  for (const key of priority) {
    let pool = (rawPlaces.value || []).filter(p => matchesFilter(p, key))
    // Pour le filtre 'wifi', on classe par débit avant d'attribuer
    if (key === 'wifi') {
      pool = [...pool].sort((a, b) => ((b as any)._wifiDownload || 0) - ((a as any)._wifiDownload || 0))
    }
    let taken = 0
    for (const p of pool) {
      if (claimed.has(p.id)) continue
      map.set(p.id, key)
      claimed.add(p.id)
      taken++
      if (taken >= 3) break
    }
  }
  return map
})

// Geolocation: enrich with distance + sort by proximity client-side
const userCoords = ref<{ lat: number; lng: number } | null>(null)
const userCity = ref<string | null>(null)

// Fetch dédié pour "Les plus proches" : prend dans TOUT le dataset (pas juste le top 100 curated)
// Bounding-box large (50 km), tri par distance fait client-side
const { data: nearestPlaces } = await useAsyncData(
  'home-nearest',
  () => userCoords.value
    ? getNearby(userCoords.value.lat, userCoords.value.lng, 50)
    : Promise.resolve([]),
  { watch: [userCoords], server: false }
)
const { public: { mapboxToken } } = useRuntimeConfig()

async function reverseGeocode(lng: number, lat: number) {
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place,locality&language=fr`)
    const data = await res.json()
    const feature = data.features?.[0]
    if (feature?.text) userCity.value = feature.text
  }
  catch {
    // ignore
  }
}

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

const places = computed(() => {
  // "Les plus proches" : dataset géographique séparé, tri par distance, aucun autre filtre
  if (displayedFilter.value.sort === 'distance' && userCoords.value && nearestPlaces.value?.length) {
    const { lat, lng } = userCoords.value
    return nearestPlaces.value
      .map(p => ({
        ...p,
        tag: undefined,
        _distKm: haversineKm(lat, lng, p.latitude, p.longitude),
        distance: formatDistance(haversineKm(lat, lng, p.latitude, p.longitude)),
      }))
      .sort((a, b) => a._distKm - b._distKm)
  }

  const currentKey = displayFilter.value

  // Filtrage client-side
  let list = (rawPlaces.value || []).filter(p => matchesFilter(p, currentKey))

  // Place d'abord les "top 3" claim de ce filtre (max 3), puis le reste
  const claimedHere = list.filter(p => topClaims.value.get(p.id) === currentKey)
  const rest = list.filter(p => topClaims.value.get(p.id) !== currentKey)
  // Tri spécial pour le filtre wifi : par débit
  if (currentKey === 'wifi') {
    rest.sort((a, b) => ((b as any)._wifiDownload || 0) - ((a as any)._wifiDownload || 0))
  }
  list = [...claimedHere, ...rest]

  // Deskovered tags pour "Nos recos" uniquement (positions 1-3)
  if (currentKey === 'recos') {
    list = list.map((p, i) => ({
      ...p,
      tag: i === 0 ? 'Deskovered #1' : i === 1 ? 'Deskovered #2' : i === 2 ? 'Deskovered #3' : undefined
    }))
  } else {
    list = list.map(p => p.tag ? { ...p, tag: undefined } : p)
  }

  // (le filtre openOnly est déjà appliqué via matchesFilter)

  // Enrich with distance if geoloc available
  if (!userCoords.value) return list

  const { lat, lng } = userCoords.value
  let withDist = list.map(p => ({
    ...p,
    _distKm: haversineKm(lat, lng, p.latitude, p.longitude),
    distance: formatDistance(haversineKm(lat, lng, p.latitude, p.longitude)),
  }))

  // Ne montrer que les lieux à moins de 10 km
  const MAX_KM = 10
  const nearby = withDist.filter(p => p._distKm <= MAX_KM)
  if (nearby.length >= 3) withDist = nearby

  return withDist
})

onMounted(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        reverseGeocode(pos.coords.longitude, pos.coords.latitude)
      },
      () => {},
      { timeout: 5000 }
    )
  }
})

useSeoMeta({
  title: 'Deskover — Les meilleurs spots pour bosser',
  ogTitle: 'Deskover — Les meilleurs spots pour bosser',
  description: 'Deskover sélectionne les meilleurs cafés, coworkings et tiers-lieux pour travailler. WiFi, prises, ambiance — tout est noté.',
  ogDescription: 'Les meilleurs cafés, coworkings et tiers-lieux pour travailler, sélectionnés pour toi.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Deskover — Les meilleurs spots pour bosser',
  twitterDescription: 'Les meilleurs cafés, coworkings et tiers-lieux pour travailler, sélectionnés pour toi.'
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://www.deskover.fr' }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify([
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': 'Deskover',
          'url': 'https://www.deskover.fr',
          'description': 'Deskover sélectionne les meilleurs cafés, coworkings et tiers-lieux pour travailler.',
          'potentialAction': {
            '@type': 'SearchAction',
            'target': 'https://www.deskover.fr/search?q={search_term_string}',
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': 'Deskover',
          'url': 'https://www.deskover.fr',
          'logo': 'https://www.deskover.fr/favicon.svg',
          'sameAs': [
            'https://www.instagram.com/deskover.fr',
            'https://www.tiktok.com/@deskover'
          ]
        }
      ])
    }
  ]
})

const supabase = useSupabaseClient()
const { data: allArticles } = await useAsyncData('home-articles', async () => {
  const { data } = await supabase
    .from('articles')
    .select('title, slug, city, city_slug, cover_image')
    .eq('published', true)
    .order('published_at', { ascending: false })
  return (data || []).map(a => ({
    title: a.title,
    slug: a.slug,
    citySlug: a.city_slug,
    tag: a.city?.toUpperCase() || null,
    img: a.cover_image || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop'
  }))
})

// Pick 5 diverse articles: 1 local (nearest city) + 4 random from different cities
const articles = computed(() => {
  const all = allArticles.value || []
  if (all.length === 0) return []

  // Find the nearest city using loaded places
  let localSlug: string | null = null
  if (userCoords.value && rawPlaces.value?.length) {
    const { lat, lng } = userCoords.value
    let minDist = Infinity
    for (const p of rawPlaces.value) {
      const d = haversineKm(lat, lng, p.latitude, p.longitude)
      if (d < minDist) {
        minDist = d
        localSlug = p.citySlug
      }
    }
  }

  const picked: typeof all = []
  const usedSlugs = new Set<string>()

  // 1. Local article first
  if (localSlug) {
    const local = all.find(a => a.citySlug === localSlug)
    if (local) {
      picked.push(local)
      usedSlugs.add(local.slug)
    }
  }

  // 2. Fill with random articles, favoring attractive cities
  const featuredCities = new Set([
    'paris', 'lyon', 'bordeaux', 'montpellier', 'nantes', 'toulouse',
    'marseille', 'nice', 'strasbourg', 'lille', 'rennes', 'annecy',
    'grenoble', 'aix-en-provence', 'tours', 'rouen', 'dijon'
  ])
  const remaining = all.filter(a => !usedSlugs.has(a.slug))
  // Shuffle using seeded random (changes daily)
  const today = new Date().toISOString().slice(0, 10)
  const seed = Array.from(today).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const shuffled = remaining
    .map((a, i) => ({ a, sort: Math.sin(seed * (i + 1)) }))
    .sort((a, b) => a.sort - b.sort)
    .map(x => x.a)
  // Mix lifestyle and city articles (alternate)
  const lifestyle = shuffled.filter(a => !a.citySlug)
  const cities = [
    ...shuffled.filter(a => a.citySlug && featuredCities.has(a.citySlug)),
    ...shuffled.filter(a => a.citySlug && !featuredCities.has(a.citySlug))
  ]
  // Deduplicate cities: keep only 1 article per city
  const seenCities = new Set<string>(localSlug ? [localSlug] : [])
  const uniqueCities = cities.filter(a => {
    if (seenCities.has(a.citySlug)) return false
    seenCities.add(a.citySlug)
    return true
  })

  let li = 0, ci = 0
  // Alternate: city, lifestyle, city, lifestyle, city, city
  const pattern = ['city', 'lifestyle', 'city', 'lifestyle', 'city', 'city']
  for (const type of pattern) {
    if (picked.length >= 6) break
    if (type === 'lifestyle' && li < lifestyle.length) {
      picked.push(lifestyle[li++])
    } else if (ci < uniqueCities.length) {
      picked.push(uniqueCities[ci++])
    } else if (li < lifestyle.length) {
      picked.push(lifestyle[li++])
    }
  }

  return picked
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- HERO -->
    <section class="relative h-[85vh] lg:h-[60vh] overflow-hidden">
      <img
        src="/img/hero-home.png"
        alt="Intérieur café"
        fetchpriority="high"
        class="w-full h-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(17,17,17,0.92)]" />

      <!-- Top bar overlay (mobile + desktop) -->
      <div class="absolute top-0 left-0 right-0 z-10">
        <div class="flex items-center justify-between px-10 pt-6 lg:container-deskover pointer-events-auto">
          <span class="font-display text-base text-white tracking-[0.15em]">DESKOVER</span>
          <NuxtLink to="/search">
            <UIcon name="lucide:search" class="w-[22px] h-[22px] text-white" />
          </NuxtLink>
        </div>
      </div>

      <!-- Hero content -->
      <div class="absolute bottom-12 left-5 right-5 z-10 lg:container-deskover lg:left-0 lg:right-0">
        <h1 class="font-display text-[44px] text-white leading-[0.95]">
          LES MEILLEURS<br>
          SPOTS POUR<br>
          BOSSER
        </h1>
        <p class="text-[16px] text-white mt-3">Autour de toi, quand tu en as besoin</p>

        <!-- Scroll indicator -->
        <div class="flex flex-col items-center mt-5">
          <div class="w-px h-6 bg-white/20 relative overflow-hidden">
            <div class="w-px h-1.5 bg-white absolute animate-[scrollDown_1.8s_ease-in-out_infinite]" />
          </div>
          <div class="w-1 h-1 rounded-full bg-white/40 mt-1" />
        </div>
      </div>
    </section>

    <!-- CLASSEMENT -->
    <section class="bg-[var(--color-cream)] rounded-t-3xl -mt-6 relative z-10 lg:rounded-none lg:mt-0">
      <!-- Quick filters -->
      <div class="lg:container-deskover">
        <div class="flex gap-2.5 overflow-x-auto no-scrollbar py-6 pl-4 lg:flex-wrap lg:py-8 lg:pl-0">
          <button
            v-for="qf in quickFilters"
            :key="qf.key"
            class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold whitespace-nowrap border"
            :class="activeQuickFilter === qf.key
              ? 'bg-[var(--color-espresso)] text-white border-[var(--color-espresso)] shadow-[0_2px_8px_rgba(44,40,37,0.2)]'
              : 'bg-white text-[var(--color-roast)] border-[var(--color-parchment)]'"
            @click="setQuickFilter(qf.key, $event)"
          >
            <UIcon :name="qf.icon" class="w-4 h-4" />
            {{ qf.label }}
          </button>
        </div>
      </div>

      <!-- Titre -->
      <div class="px-4 pb-1 lg:container-deskover">
        <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.04em]">{{ pageTitle }}</h2>
        <p class="text-[13px] text-[var(--color-roast)] mt-1.5 leading-tight min-h-[2.8em]">{{ pageSubtitle }}</p>
      </div>

      <FabCarte />

      <!-- Cards -->
      <div class="px-4 pt-4 flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:container-deskover">
        <NuxtLink
          v-for="place in (places || []).slice(0, 20)"
          :key="place.id"
          :to="`/lieu/${place.slug || place.id}`"
          class="block h-full"
        >
          <PlaceCard :place="{
            name: place.name,
            type: place.category === 'coffee_shop' ? 'Coffee Shop' : place.category === 'cafe' ? 'Café' : place.category === 'coworking' ? 'Coworking' : place.category === 'tiers_lieu' ? 'Tiers-lieu' : place.category,
            neighborhood: '',
            city: (place.address || place.city).replace(/,\s*France\s*$/i, ''),
            distance: place.distance || '',
            isOpen: place.isOpen ?? true,
            nextOpen: place.nextOpen,
            tag: place.tag,
            image: place.cardUrl || place.photoUrl || place.photos?.[0] || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
            images: place.photos || [],
            vitals: place.vitals
          }" />
        </NuxtLink>
      </div>

      <!-- Nos articles -->
      <div v-if="articles?.length" class="px-4 mt-10 lg:container-deskover">
        <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.04em]">À LIRE</h2>
        <p class="text-[13px] text-[var(--color-roast)] mt-1.5 leading-relaxed mb-5">
          Guides, conseils, retours d'expérience. Tout ce qu'on aurait aimé savoir avant de poser notre ordi.
        </p>

        <!-- Mobile: 1 grand + 2 petits -->
        <!-- Desktop: magazine layout -->

        <!-- Row 1: 1 grand (2/3) + 2 empilés (1/3) -->
        <div class="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-3">
          <NuxtLink
            v-if="articles[0]"
            :to="`/articles/${articles[0].slug}`"
            class="block relative rounded-2xl overflow-hidden h-[220px] lg:h-[340px] lg:col-span-2 shadow-[0_2px_12px_rgba(44,40,37,0.1)]"
          >
            <img :src="articles[0].img" :alt="articles[0].title" class="absolute inset-0 w-full h-full object-cover" loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div class="absolute bottom-0 left-0 right-0 p-5">
              <div v-if="articles[0].tag" class="text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1.5">{{ articles[0].tag }}</div>
              <div class="text-[17px] lg:text-[20px] font-bold text-white leading-snug">{{ articles[0].title }}</div>
            </div>
          </NuxtLink>

          <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-1 lg:gap-3">
            <NuxtLink
              v-for="article in articles.slice(1, 3)"
              :key="article.slug"
              :to="`/articles/${article.slug}`"
              class="block relative rounded-xl overflow-hidden h-[160px] shadow-[0_2px_8px_rgba(44,40,37,0.08)]"
            >
              <img :src="article.img" :alt="article.title" class="absolute inset-0 w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
              <div class="absolute bottom-0 left-0 right-0 p-3">
                <div v-if="article.tag" class="text-[9px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1">{{ article.tag }}</div>
                <div class="text-[13px] font-semibold text-white leading-snug">{{ article.title }}</div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Row 2: 3 cards -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2.5 lg:gap-3 mt-2.5 lg:mt-3">
          <NuxtLink
            v-for="article in articles.slice(3, 6)"
            :key="article.slug"
            :to="`/articles/${article.slug}`"
            class="block relative rounded-xl overflow-hidden h-[160px] lg:h-[180px] shadow-[0_2px_8px_rgba(44,40,37,0.08)]"
          >
            <img :src="article.img" :alt="article.title" class="absolute inset-0 w-full h-full object-cover" loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <div class="absolute bottom-0 left-0 right-0 p-3">
              <div v-if="article.tag" class="text-[9px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1">{{ article.tag }}</div>
              <div class="text-[13px] font-semibold text-white leading-snug">{{ article.title }}</div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Footer -->
      <DeskoverFooter class="mt-8" />
    </section>

    <!-- Modal géolocalisation (ClientOnly pour éviter hydration mismatch en SSR) -->
    <ClientOnly>
    <Teleport to="body">
      <div v-if="showGeoModal" class="fixed inset-0 z-[200] flex items-end lg:items-center justify-center">
        <div class="absolute inset-0 bg-black/40" @click="showGeoModal = false" />
        <div class="relative bg-white rounded-t-[20px] lg:rounded-[20px] p-6 pb-8 lg:pb-6 w-full lg:max-w-md mx-auto space-y-4">
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center">
              <UIcon name="lucide:map-pin-off" class="w-5 h-5 text-[var(--color-terracotta-500)]" />
            </div>
            <button @click="showGeoModal = false" class="p-1 text-[var(--color-steam)]">
              <UIcon name="lucide:x" class="w-5 h-5" />
            </button>
          </div>
          <div>
            <h3 class="font-display text-lg text-[var(--color-espresso)]">Active ta localisation</h3>
            <p class="text-sm text-[var(--color-roast)] mt-2 leading-relaxed">
              Pour te montrer les spots les plus proches, on a besoin de ta position.
              Autorise la géolocalisation dans les réglages de ton navigateur puis réessaie.
            </p>
          </div>
          <!-- Instructions détaillées par navigateur/OS -->
          <div>
            <button
              class="text-sm font-medium text-[var(--color-terracotta-500)] flex items-center gap-1"
              @click="showGeoHelp = !showGeoHelp"
            >
              Je ne sais pas comment faire
              <UIcon :name="showGeoHelp ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="w-4 h-4" />
            </button>
            <div v-if="showGeoHelp" class="mt-3 text-[13px] text-[var(--color-roast)] leading-relaxed space-y-3">
              <!-- iPhone -->
              <div v-if="geoHelpOS === 'ios'">
                <p class="font-semibold text-[var(--color-espresso)]">Sur iPhone</p>
                <ol class="list-decimal list-inside space-y-1 mt-1">
                  <li>Ouvre <strong>Réglages</strong> > <strong>Confidentialité et sécurité</strong> > <strong>Service de localisation</strong></li>
                  <li>Vérifie que le service est <strong>activé</strong> en haut</li>
                  <li>Descends jusqu'à <strong>{{ geoHelpBrowser === 'chrome' ? 'Chrome' : 'Safari' }}</strong> et choisis <strong>Lorsque l'app est active</strong></li>
                  <li>Reviens ici et recharge la page</li>
                </ol>
              </div>
              <!-- Android -->
              <div v-else-if="geoHelpOS === 'android'">
                <p class="font-semibold text-[var(--color-espresso)]">Sur Android</p>
                <ol class="list-decimal list-inside space-y-1 mt-1">
                  <li>Appuie sur l'icône <strong>ⓘ</strong> à gauche de l'URL</li>
                  <li>Appuie sur <strong>Autorisations</strong></li>
                  <li>Active <strong>Position</strong></li>
                  <li>Recharge la page</li>
                </ol>
              </div>
              <!-- Chrome desktop -->
              <div v-else-if="geoHelpBrowser === 'chrome'">
                <p class="font-semibold text-[var(--color-espresso)]">Sur Chrome</p>
                <ol class="list-decimal list-inside space-y-1 mt-1">
                  <li>Clique sur l'icône <strong>ⓘ</strong> (ou le cadenas) à gauche de l'URL</li>
                  <li>Clique sur <strong>Position</strong> et active le toggle</li>
                  <li>Recharge la page</li>
                </ol>
              </div>
              <!-- Firefox -->
              <div v-else-if="geoHelpBrowser === 'firefox'">
                <p class="font-semibold text-[var(--color-espresso)]">Sur Firefox</p>
                <ol class="list-decimal list-inside space-y-1 mt-1">
                  <li>Clique sur l'icône à gauche de l'URL</li>
                  <li>Dans <strong>Permissions</strong>, autorise la <strong>Position</strong></li>
                  <li>Recharge la page</li>
                </ol>
              </div>
              <!-- Safari macOS -->
              <div v-else-if="geoHelpBrowser === 'safari'">
                <p class="font-semibold text-[var(--color-espresso)]">Sur Safari</p>
                <ol class="list-decimal list-inside space-y-1 mt-1">
                  <li>Va dans <strong>Safari</strong> > <strong>Réglages</strong> > <strong>Sites web</strong> > <strong>Position</strong></li>
                  <li>Trouve <strong>deskover.fr</strong> et choisis <strong>Autoriser</strong></li>
                  <li>Recharge la page</li>
                </ol>
              </div>
              <!-- Fallback -->
              <div v-else>
                <p class="font-semibold text-[var(--color-espresso)]">Dans ton navigateur</p>
                <ol class="list-decimal list-inside space-y-1 mt-1">
                  <li>Cherche l'icône <strong>ⓘ</strong> ou le cadenas dans la barre d'adresse</li>
                  <li>Autorise la <strong>Position</strong> pour ce site</li>
                  <li>Recharge la page</li>
                </ol>
              </div>
            </div>
          </div>
          <button
            class="w-full py-3 rounded-xl bg-[var(--color-espresso)] text-white text-sm font-semibold"
            @click="showGeoModal = false; showGeoHelp = false"
          >
            Compris
          </button>
        </div>
      </div>
    </Teleport>
    </ClientOnly>
  </div>
</template>

<style>
@keyframes scrollDown {
  0% { top: -6px; }
  100% { top: 24px; }
}
</style>
