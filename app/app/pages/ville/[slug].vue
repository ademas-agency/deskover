<script setup lang="ts">
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
  // Fallback from slug
  if (slug.startsWith('paris-')) {
    return 'Paris ' + slug.replace('paris-', '').replace('e', 'ᵉ')
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
})

const articleSlug = computed(() => `travailler-${slug}`)

useHead({
  title: () => `Où travailler à ${cityName.value} - Deskover`,
  meta: [
    { name: 'description', content: () => `Les meilleurs cafés, coworkings et spots pour bosser à ${cityName.value}. WiFi, prises, ambiance - tout est noté.` },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Header desktop only -->
    <div class="hidden lg:block">
      <DeskoverHeader />
    </div>

    <!-- Header mobile -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center lg:hidden">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <!-- Hero -->
    <div class="px-5 pt-6 pb-4 lg:max-w-[1080px] lg:mx-auto">
      <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2">
        {{ places.length }} spots
      </div>
      <h1 class="font-display text-[26px] text-[var(--color-espresso)] leading-[1.1]">
        Où travailler à {{ cityName }}
      </h1>
      <p class="text-[14px] text-[var(--color-roast)] mt-2 leading-relaxed">
        Les meilleurs cafés, coworkings et tiers-lieux pour bosser à {{ cityName }}.
      </p>
    </div>

    <!-- Lien vers l'article -->
    <div class="px-5 mb-4 lg:max-w-[1080px] lg:mx-auto">
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
    <div class="px-5 pb-24 lg:max-w-[1080px] lg:mx-auto">
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
              tag: i === 0 ? 'Deskovered #1' : i === 1 ? 'Deskovered #2' : i === 2 ? 'Deskovered #3' : undefined,
              image: place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop',
              images: place.photos || [],
              vitals: place.vitals,
            }"
          />
        </NuxtLink>
      </div>
    </div>

    <DeskoverFooter />
  </div>
</template>
