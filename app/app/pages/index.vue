<script setup lang="ts">
import type { PlaceFilters } from '~/domain/models/Place'

const { getAll } = usePlaces()
const route = useRoute()

// Read filters from URL query params (set by /search page)
const urlQuery = route.query

const activeFilters = ref([
  { label: 'WiFi', value: 'wifi', active: !!urlQuery.wifi },
  { label: 'Prises', value: 'prises', active: !!urlQuery.prises },
  { label: 'Food', value: 'food', active: !!urlQuery.food },
  { label: 'Style', value: 'style', active: !!urlQuery.style },
  { label: 'Cafés', value: 'cafe', active: urlQuery.type === 'cafe' },
  { label: 'Coffee Shops', value: 'coffee_shop', active: urlQuery.type === 'coffee_shop' },
  { label: 'Coworking', value: 'coworking', active: urlQuery.type === 'coworking' },
  { label: 'Tiers-lieux', value: 'tiers_lieu', active: urlQuery.type === 'tiers_lieu' }
])

const searchQuery = (urlQuery.q as string) || ''
const filterOpen = !!urlQuery.open
const hasFilters = Object.keys(urlQuery).length > 0

// Title based on filters
const pageTitle = computed(() => {
  if (searchQuery) return searchQuery.toUpperCase()
  const type = urlQuery.type as string
  if (type === 'cafe') return 'LES MEILLEURS CAFÉS'
  if (type === 'coffee_shop') return 'COFFEE SHOPS'
  if (type === 'coworking') return 'COWORKINGS'
  if (type === 'tiers_lieu') return 'TIERS-LIEUX'
  return 'NOS COUPS DE COEUR'
})

function toggleFilter(value: string) {
  const filter = activeFilters.value.find(f => f.value === value)
  if (filter) filter.active = !filter.active
}

const computedFilters = computed<PlaceFilters>(() => {
  const f: PlaceFilters = {}
  const active = activeFilters.value.filter(x => x.active).map(x => x.value)
  if (active.includes('wifi')) f.wifi = true
  if (active.includes('prises')) f.prises = true
  if (active.includes('food')) f.food = true
  if (active.includes('style')) f.calme = true
  const cats = active.filter(v => ['cafe', 'coffee_shop', 'coworking', 'tiers_lieu'].includes(v))
  if (cats.length === 1) f.category = cats[0]
  if (searchQuery) f.query = searchQuery
  return f
})

const places = ref<any[]>([])
const loading = ref(true)

async function loadPlaces() {
  loading.value = true
  let results = await getAll(computedFilters.value)
  if (filterOpen) {
    results = results.filter(p => p.isOpen !== false)
  }
  places.value = results
  loading.value = false
}

onMounted(() => loadPlaces())
watch(computedFilters, () => loadPlaces())

const articles = [
  {
    title: 'Où travailler à Lyon',
    slug: 'travailler-lyon',
    tag: 'GUIDE',
    img: 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=600&h=400&fit=crop'
  },
  {
    title: 'Où travailler à Bordeaux',
    slug: 'travailler-bordeaux',
    tag: 'GUIDE',
    img: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&h=400&fit=crop'
  },
  {
    title: 'Où travailler à Nantes',
    slug: 'travailler-nantes',
    tag: 'GUIDE',
    img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop'
  },
  {
    title: 'Les meilleurs spots du Marais',
    slug: 'travailler-paris-3e',
    tag: 'PARIS',
    img: 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=600&h=400&fit=crop'
  },
  {
    title: 'Où bosser dans le 11e',
    slug: 'travailler-paris-11e',
    tag: 'PARIS',
    img: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&h=400&fit=crop'
  }
]
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Header desktop -->
    <DeskoverHeader class="hidden lg:block" />

    <!-- HERO -->
    <section class="relative h-[85vh] lg:h-[50vh] overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=1200&fit=crop"
        alt="Intérieur café"
        class="w-full h-full object-cover animate-[heroZoom_25s_ease-in-out_infinite_alternate]"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(17,17,17,0.92)]" />

      <!-- Top bar (mobile only) -->
      <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-[52px] z-10 lg:hidden">
        <span class="font-display text-base text-white tracking-[0.15em]">DESKOVER</span>
        <NuxtLink to="/search">
          <UIcon name="lucide:search" class="w-[22px] h-[22px] text-white" />
        </NuxtLink>
      </div>

      <!-- Hero content -->
      <div class="absolute bottom-12 left-5 right-5 z-10">
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
      <!-- Filtres -->
      <div class="lg:container-deskover">
        <FilterChips :filters="activeFilters" @toggle="toggleFilter" />
      </div>

      <!-- Titre -->
      <div class="px-4 pb-1 lg:container-deskover">
        <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.04em]">{{ pageTitle }}</h2>
        <p v-if="searchQuery" class="text-[13px] text-[var(--color-steam)] mt-0.5">{{ places.length }} lieu{{ places.length > 1 ? 'x' : '' }} trouvé{{ places.length > 1 ? 's' : '' }}</p>
      </div>

      <!-- FAB Carte (mobile only) -->
      <NuxtLink
        to="/carte"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[var(--color-espresso)] text-white px-5 py-3 rounded-full shadow-[0_4px_20px_rgba(44,40,37,0.3)] hover:shadow-[0_6px_28px_rgba(44,40,37,0.4)] transition-all duration-200 lg:hidden"
      >
        <UIcon name="lucide:map" class="w-[18px] h-[18px]" />
        <span class="text-[13px] font-semibold">Carte</span>
      </NuxtLink>

      <!-- Cards -->
      <div class="px-4 pt-4 flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:container-deskover">
        <NuxtLink
          v-for="place in (places || []).slice(0, 20)"
          :key="place.id"
          :to="`/lieu/${place.id}`"
          class="block"
        >
          <PlaceCard :place="{
            name: place.name,
            type: place.category === 'coffee_shop' ? 'Coffee Shop' : place.category === 'cafe' ? 'Café' : place.category === 'coworking' ? 'Coworking' : place.category === 'tiers_lieu' ? 'Tiers-lieu' : place.category,
            neighborhood: place.arrondissement ? `${place.city} ${place.arrondissement}e` : '',
            city: place.address || place.city,
            distance: place.distance || '',
            isOpen: place.isOpen ?? true,
            nextOpen: place.nextOpen,
            tag: place.tag,
            image: place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
            vitals: place.vitals
          }" />
        </NuxtLink>
      </div>

      <!-- Nos articles -->
      <div class="px-4 mt-10 lg:container-deskover">
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
@keyframes heroZoom {
  0% { transform: scale(1); }
  100% { transform: scale(1.12); }
}

@keyframes scrollDown {
  0% { top: -6px; }
  100% { top: 24px; }
}
</style>
