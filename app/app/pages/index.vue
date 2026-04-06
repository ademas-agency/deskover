<script setup lang="ts">
import type { PlaceFilters } from '~/domain/models/Place'

const { getAll } = usePlaces()

// Quick filter cards — editorial picks that combine filter + sort
const quickFilters = [
  { key: 'recos', label: 'Nos recos', icon: 'lucide:sparkles', filter: {} as PlaceFilters, sort: 'relevance' as const },
  { key: 'proche', label: 'Les plus proches', icon: 'lucide:map-pin', filter: {} as PlaceFilters, sort: 'distance' as const },
  { key: 'ouvert', label: 'Ouvert maintenant', icon: 'lucide:clock', filter: {} as PlaceFilters, sort: 'relevance' as const, openOnly: true },
  { key: 'wifi', label: 'Meilleur WiFi', icon: 'lucide:wifi', filter: { wifi: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'calme', label: 'Bosser au calme', icon: 'lucide:volume-x', filter: { calme: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'terrasse', label: 'Terrasses', icon: 'lucide:sun', filter: { terrasse: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'gratuit', label: 'Gratuit', icon: 'lucide:ticket', filter: { gratuit: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'food', label: 'Bien manger', icon: 'lucide:utensils', filter: { food: true } as PlaceFilters, sort: 'relevance' as const },
  { key: 'coworking', label: 'Coworkings', icon: 'lucide:building-2', filter: { category: 'coworking' } as PlaceFilters, sort: 'relevance' as const },
  { key: 'cafe', label: 'Cafés', icon: 'lucide:coffee', filter: { category: 'cafe' } as PlaceFilters, sort: 'relevance' as const },
]

const activeQuickFilter = ref('recos')

function setQuickFilter(key: string) {
  activeQuickFilter.value = activeQuickFilter.value === key ? 'recos' : key
}

const currentFilter = computed(() => quickFilters.find(f => f.key === activeQuickFilter.value) || quickFilters[0])

const pageTitle = computed(() => {
  switch (activeQuickFilter.value) {
    case 'proche': return 'LES PLUS PROCHES'
    case 'wifi': return 'MEILLEUR WIFI'
    case 'calme': return 'BOSSER AU CALME'
    case 'terrasse': return 'TERRASSES'
    case 'gratuit': return 'ACCÈS GRATUIT'
    case 'food': return 'BIEN MANGER'
    case 'ouvert': return 'OUVERT MAINTENANT'
    case 'coworking': return 'COWORKINGS'
    case 'cafe': return 'CAFÉS'
    default: return 'NOS RECOS'
  }
})

const pageSubtitle = computed(() => {
  switch (activeQuickFilter.value) {
    case 'recos': return 'Les pépites choisies par Deskover.'
    case 'proche': return 'Pour ta réunion qui commence dans 10 minutes.'
    case 'wifi': return 'Du débit, du vrai.'
    case 'calme': return 'Zéro bruit de fond, concentration maximale.'
    case 'terrasse': return 'Aux beaux jours, on veut le combo boulot-soleil-café.'
    case 'gratuit': return 'Pose-toi, commande un café, c\'est tout.'
    case 'food': return 'Parce qu\'on bosse mieux le ventre plein.'
    case 'ouvert': return 'Tu peux y aller, ces spots sont ouverts en ce moment.'
    case 'coworking': return 'Des vrais espaces pensés pour bosser, avec tout ce qu\'il faut.'
    case 'cafe': return 'L\'art de poser son laptop entre deux expressos.'
    default: return ''
  }
})

const { data: rawPlaces, status } = await useAsyncData(
  'home-places',
  () => getAll(currentFilter.value.filter),
  { watch: [currentFilter] }
)
const loading = computed(() => status.value === 'pending')

// Geolocation: enrich with distance + sort by proximity client-side
const userCoords = ref<{ lat: number; lng: number } | null>(null)

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
  let list = rawPlaces.value || []

  // Filter open only
  if (currentFilter.value.openOnly) {
    list = list.filter(p => p.isOpen !== false)
  }

  // Enrich with distance if geoloc available
  if (!userCoords.value) return list

  const { lat, lng } = userCoords.value
  let withDist = list.map(p => ({
    ...p,
    _distKm: haversineKm(lat, lng, p.latitude, p.longitude),
    distance: formatDistance(haversineKm(lat, lng, p.latitude, p.longitude)),
  }))

  // Ne montrer que les lieux à moins de 10 km (sauf "Le plus proche" qui montre tout trié)
  const MAX_KM = 10
  if (currentFilter.value.sort !== 'distance') {
    const nearby = withDist.filter(p => p._distKm <= MAX_KM)
    if (nearby.length >= 3) withDist = nearby
  }

  // Sort by distance only when "Le plus proche" is active
  if (currentFilter.value.sort === 'distance') {
    return withDist.sort((a, b) => a._distKm - b._distKm)
  }

  return withDist
})

onMounted(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => { userCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
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
    tag: a.city?.toUpperCase() || 'GUIDE',
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
  // Featured cities first, then the rest
  const prioritized = [
    ...shuffled.filter(a => featuredCities.has(a.citySlug)),
    ...shuffled.filter(a => !featuredCities.has(a.citySlug))
  ]

  for (const a of prioritized) {
    if (picked.length >= 5) break
    picked.push(a)
  }

  return picked
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- HERO -->
    <section class="relative h-[85vh] lg:h-[60vh] overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=1200&fit=crop"
        alt="Intérieur café"
        class="w-full h-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(17,17,17,0.92)]" />

      <!-- Top bar overlay (mobile + desktop) -->
      <div class="absolute top-0 left-0 right-0 z-10">
        <div class="flex items-center justify-between px-5 pt-safe lg:pt-6 lg:px-10 lg:container-deskover">
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
        <p class="text-[13px] text-white/50 mt-3">Autour de toi, quand tu en as besoin</p>

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
        <div class="flex gap-2.5 overflow-x-auto no-scrollbar py-6 lg:flex-wrap lg:py-8">
          <button
            v-for="qf in quickFilters"
            :key="qf.key"
            class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold whitespace-nowrap border"
            :class="activeQuickFilter === qf.key
              ? 'bg-[var(--color-espresso)] text-white border-[var(--color-espresso)] shadow-[0_2px_8px_rgba(44,40,37,0.2)]'
              : 'bg-white text-[var(--color-roast)] border-[var(--color-parchment)]'"
            @click="setQuickFilter(qf.key)"
          >
            <UIcon :name="qf.icon" class="w-4 h-4" />
            {{ qf.label }}
          </button>
        </div>
      </div>

      <!-- Titre -->
      <div class="px-4 pb-1 lg:container-deskover">
        <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.04em]">{{ pageTitle }}</h2>
        <p v-if="pageSubtitle" class="text-[13px] text-[var(--color-roast)] mt-1.5 leading-relaxed">{{ pageSubtitle }}</p>
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
            city: place.address || place.city,
            distance: place.distance || '',
            isOpen: place.isOpen ?? true,
            nextOpen: place.nextOpen,
            tag: place.tag,
            image: place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
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

        <!-- Article principal (large) -->
        <NuxtLink
          :to="`/articles/${articles[0].slug}`"
          class="block relative rounded-2xl overflow-hidden h-[220px] shadow-[0_2px_12px_rgba(44,40,37,0.1)]"
        >
          <img :src="articles[0].img" :alt="articles[0].title" class="absolute inset-0 w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 p-4">
            <div class="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-terracotta-300)] mb-1.5">{{ articles[0].tag }}</div>
            <div class="text-[16px] font-bold text-white leading-snug">{{ articles[0].title }}</div>
          </div>
        </NuxtLink>

        <!-- Articles secondaires -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3">
          <NuxtLink
            v-for="article in articles.slice(1)"
            :key="article.slug + article.title"
            :to="`/articles/${article.slug}`"
            class="block relative rounded-xl overflow-hidden h-[160px] shadow-[0_2px_8px_rgba(44,40,37,0.08)]"
          >
            <img :src="article.img" :alt="article.title" class="absolute inset-0 w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <div class="absolute bottom-0 left-0 right-0 p-3">
              <div class="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-terracotta-300)] mb-1">{{ article.tag }}</div>
              <div class="text-[12px] font-semibold text-white leading-snug">{{ article.title }}</div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Footer -->
      <DeskoverFooter class="mt-8" />
    </section>
  </div>
</template>

<style>
@keyframes scrollDown {
  0% { top: -6px; }
  100% { top: 24px; }
}
</style>
