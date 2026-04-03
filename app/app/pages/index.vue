<script setup lang="ts">
import type { PlaceFilters } from '~/domain/models/Place'

const { getAll } = usePlaces()

const activeFilters = ref([
  { label: 'WiFi', value: 'wifi', active: false },
  { label: 'Prises', value: 'prises', active: false },
  { label: 'Food', value: 'food', active: false },
  { label: 'Calme', value: 'calme', active: false },
  { label: 'Cafés', value: 'cafe', active: false },
  { label: 'Coffee Shops', value: 'coffee_shop', active: false },
  { label: 'Coworking', value: 'coworking', active: false },
  { label: 'Tiers-lieux', value: 'tiers_lieu', active: false }
])

function toggleFilter(value: string) {
  const filter = activeFilters.value.find(f => f.value === value)
  if (filter) filter.active = !filter.active
}

const computedFilters = computed<PlaceFilters>(() => {
  const f: PlaceFilters = {}
  const active = activeFilters.value.filter(x => x.active).map(x => x.value)
  // Only apply filters if something is actively selected
  if (active.includes('wifi')) f.wifi = true
  if (active.includes('prises')) f.prises = true
  if (active.includes('food')) f.food = true
  if (active.includes('calme')) f.calme = true
  const cats = active.filter(v => ['cafe', 'coffee_shop', 'coworking', 'tiers_lieu'].includes(v))
  if (cats.length === 1) f.category = cats[0]
  return f
})

// Empty filters = show all (no filtering)

const places = ref<any[]>([])
const loading = ref(true)

async function loadPlaces() {
  loading.value = true
  places.value = await getAll(computedFilters.value)
  loading.value = false
}

// Load on mount (client-side only)
onMounted(() => loadPlaces())

// Reload when filters change
watch(computedFilters, () => loadPlaces())

const press = [
  { source: 'Le Bonbon', title: 'Top 10 cafés WiFi à Paris' },
  { source: 'Time Out', title: 'Les meilleurs coworkings' },
  { source: 'Konbini', title: 'Où bosser à Paris ?' }
]
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- HERO -->
    <section class="relative h-[85vh] overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=1200&fit=crop"
        alt="Intérieur café"
        class="w-full h-full object-cover animate-[heroZoom_25s_ease-in-out_infinite_alternate]"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(17,17,17,0.92)]" />

      <!-- Top bar -->
      <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-[52px] z-10">
        <span class="font-display text-base text-white tracking-[0.15em]">DESKOVER</span>
        <NuxtLink to="/search">
          <UIcon name="lucide:search" class="w-[22px] h-[22px] text-white" />
        </NuxtLink>
      </div>

      <!-- Hero content -->
      <div class="absolute bottom-12 left-5 right-5 z-10">
        <div class="text-xs uppercase tracking-[0.2em] text-white/60 mb-3">Paris</div>
        <h1 class="font-display text-[44px] text-white leading-[0.95]">
          LES MEILLEURS<br>
          SPOTS POUR<br>
          BOSSER
        </h1>
        <p class="text-[13px] text-white/50 italic mt-3">Sélection Deskover</p>

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
    <section class="bg-[var(--color-cream)] rounded-t-3xl -mt-6 relative z-10">
      <!-- Filtres -->
      <FilterChips :filters="activeFilters" @toggle="toggleFilter" />

      <!-- Titre -->
      <div class="px-4 pb-1">
        <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.04em]">NOS COUPS DE COEUR</h2>
        <p class="text-[13px] text-[var(--color-steam)] mt-0.5">près de toi</p>
      </div>

      <!-- Cards -->
      <div class="px-4 pt-4 flex flex-col gap-5">
        <NuxtLink
          v-for="place in (places || []).slice(0, 20)"
          :key="place.id"
          :to="`/lieu/${place.id}`"
          class="block"
        >
          <PlaceCard :place="{
            name: place.name,
            type: place.category === 'coffee_shop' ? 'Coffee Shop' : place.category === 'cafe' ? 'Café' : place.category === 'coworking' ? 'Coworking' : place.category === 'tiers_lieu' ? 'Tiers-lieu' : place.category,
            neighborhood: place.arrondissement ? `${place.city} ${place.arrondissement}e` : place.city,
            city: place.city,
            distance: place.distance || '',
            isOpen: place.isOpen ?? true,
            tag: place.tag,
            image: place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
            vitals: place.vitals
          }" />
        </NuxtLink>
      </div>

      <!-- Vu dans -->
      <div class="px-4 mt-8">
        <div class="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-steam)] mb-2.5">Vu dans</div>
        <div class="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
          <PressCard
            v-for="item in press"
            :key="item.source"
            :source="item.source"
            :title="item.title"
          />
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex gap-2.5 px-4 mt-8 pb-2">
        <NuxtLink to="/carte" class="flex-1 flex items-center justify-center gap-2 bg-[var(--color-espresso)] text-[var(--color-cream)] text-[13px] font-semibold py-3.5 rounded-[14px]">
          <UIcon name="lucide:map" class="w-[18px] h-[18px]" />
          Voir la carte
        </NuxtLink>
        <NuxtLink to="/search" class="flex-1 flex items-center justify-center gap-2 bg-[var(--color-terracotta-500)] text-[var(--color-cream)] text-[13px] font-semibold py-3.5 rounded-[14px]">
          <UIcon name="lucide:search" class="w-[18px] h-[18px]" />
          Rechercher
        </NuxtLink>
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
