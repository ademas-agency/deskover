<script setup lang="ts">
const props = defineProps<{ id: string }>()

const { getById } = usePlaces()
const place = ref<any>(null)

onMounted(async () => {
  place.value = await getById(props.id)
})

function categoryLabel(cat: string) {
  switch (cat) {
    case 'cafe': return 'Café'
    case 'coffee_shop': return 'Coffee Shop'
    case 'coworking': return 'Coworking'
    case 'tiers_lieu': return 'Tiers-lieu'
    default: return cat
  }
}
</script>

<template>
  <NuxtLink
    v-if="place"
    :to="`/lieu/${place.slug || place.id}`"
    class="block mx-5 my-5 no-underline"
  >
    <article class="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(44,40,37,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,40,37,0.12)]">
      <!-- Image -->
      <div class="relative h-[300px] overflow-hidden">
        <img
          :src="place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop'"
          :alt="place.name"
          class="w-full h-full object-cover object-center"
        >
        <!-- Status badge -->
        <div
          class="absolute top-3 right-3 px-2.5 h-[28px] rounded-lg text-white text-[10px] font-bold uppercase backdrop-blur-md flex items-center justify-center"
          :style="{ background: place.isOpen ? 'rgba(91,122,94,0.92)' : 'rgba(170,76,77,0.92)' }"
        >
          {{ place.isOpen ? 'Ouvert' : (place.nextOpen || 'Fermé') }}
        </div>
      </div>
      <!-- Body -->
      <div class="p-[18px]">
        <h3 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.02em] uppercase m-0 text-left">
          {{ place.name }}
        </h3>
        <p class="text-xs text-[var(--color-steam)] mt-1 !p-0 text-left">
          {{ categoryLabel(place.category) }} · {{ place.city }}
        </p>
        <!-- Vitals -->
        <PlaceVitals :vitals="place.vitals" class="mt-3.5" />
      </div>
    </article>
  </NuxtLink>
</template>
