<script setup lang="ts">
const route = useRoute()
const { getById } = usePlaces()

const place = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  place.value = await getById(route.params.id as string)
  loading.value = false
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
  <div v-if="place" class="min-h-screen bg-[var(--color-cream)] pb-28">
    <!-- Photo hero -->
    <div class="relative h-[260px] overflow-hidden">
      <img
        :src="place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop'"
        :alt="place.name"
        class="w-full h-full object-cover"
        style="border-radius: 0 0 24px 24px;"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" style="border-radius: 0 0 24px 24px;" />

      <!-- Header overlay -->
      <div class="absolute top-[52px] left-4 right-4 flex justify-between items-center">
        <NuxtLink
          to="/"
          class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center"
        >
          <UIcon name="lucide:chevron-left" class="w-5 h-5 text-white" />
        </NuxtLink>
        <div class="flex gap-2">
          <button class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center">
            <UIcon name="lucide:heart" class="w-5 h-5 text-white" />
          </button>
          <button class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center">
            <UIcon name="lucide:share" class="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <!-- Badges -->
      <div class="absolute bottom-4 left-4 flex gap-2">
        <div v-if="place.tag" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-terracotta-500)] text-white text-[10px] font-bold uppercase tracking-wide">
          <UIcon v-if="place.tag === 'Number one'" name="lucide:crown" class="w-3.5 h-3.5" />
          <span>{{ place.tag }}</span>
        </div>
        <div
          class="px-2.5 py-1 rounded-lg text-white text-[10px] font-bold uppercase backdrop-blur-md"
          :class="place.isOpen ? 'bg-[var(--color-monstera)]/90' : 'bg-[var(--color-terracotta-500)]/90'"
        >
          {{ place.isOpen ? 'Ouvert' : 'Fermé' }}
        </div>
      </div>
    </div>

    <!-- Infos -->
    <div class="px-4 pt-5">
      <h1 class="font-display text-[22px] text-[var(--color-espresso)]">{{ place.name }}</h1>
      <p class="text-[13px] text-[var(--color-steam)] mt-1">
        {{ categoryLabel(place.category) }} · {{ place.address }}
      </p>
    </div>

    <!-- Bouton itinéraire -->
    <div class="px-4 mt-4">
      <a
        :href="place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`"
        target="_blank"
        class="block bg-[var(--color-espresso)] text-[var(--color-cream)] text-sm font-semibold py-3.5 rounded-[14px] text-center"
      >
        <UIcon name="lucide:navigation" class="w-4 h-4 inline mr-2" />
        Itinéraire
      </a>
    </div>

    <!-- Vitals -->
    <div class="px-4 mt-5">
      <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-2.5">LES VITALS</div>
      <PlaceVitals :vitals="place.vitals" size="lg" />
    </div>

    <!-- Infos pratiques -->
    <div class="px-4 mt-5">
      <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-3">INFOS</div>
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <UIcon name="lucide:map-pin" class="w-[18px] h-[18px] text-[var(--color-steam)]" />
          <span class="text-sm text-[var(--color-roast)]">{{ place.address }}</span>
        </div>
        <div v-if="place.phone" class="flex items-center gap-3">
          <UIcon name="lucide:phone" class="w-[18px] h-[18px] text-[var(--color-steam)]" />
          <a :href="`tel:${place.phone}`" class="text-sm text-[var(--color-roast)]">{{ place.phone }}</a>
        </div>
        <div v-if="place.website" class="flex items-center gap-3">
          <UIcon name="lucide:globe" class="w-[18px] h-[18px] text-[var(--color-steam)]" />
          <a :href="place.website" target="_blank" class="text-sm text-[var(--color-terracotta-500)] font-medium">Site web</a>
        </div>
      </div>
    </div>

    <!-- Blog mentions -->
    <div v-if="place.blogMentions.length" class="px-4 mt-6">
      <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-2.5">VU DANS</div>
      <div class="flex flex-col gap-2.5">
        <a
          v-for="mention in place.blogMentions.slice(0, 3)"
          :key="mention.url"
          :href="mention.url"
          target="_blank"
          rel="noopener"
          class="block bg-white rounded-[14px] p-4 shadow-[0_2px_8px_rgba(44,40,37,0.06)] hover:shadow-[0_4px_12px_rgba(44,40,37,0.1)] transition-shadow"
        >
          <div class="text-[10px] text-[var(--color-terracotta-500)] font-bold uppercase">{{ mention.source }}</div>
          <div class="text-sm text-[var(--color-espresso)] font-semibold mt-1">{{ mention.title }}</div>
          <div class="text-xs text-[var(--color-terracotta-500)] mt-1.5">Lire l'article →</div>
        </a>
      </div>
    </div>

    <!-- CTA sticky -->
    <div class="fixed bottom-0 left-0 right-0 p-4 pb-9 bg-gradient-to-t from-[var(--color-cream)] via-[var(--color-cream)] to-transparent z-50">
      <button class="w-full bg-[var(--color-terracotta-500)] text-[var(--color-cream)] text-sm font-bold py-3.5 rounded-[14px] flex items-center justify-center gap-2">
        <UIcon name="lucide:sparkles" class="w-[18px] h-[18px]" />
        Donner mon avis
      </button>
    </div>
  </div>
</template>
