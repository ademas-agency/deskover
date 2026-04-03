<script setup lang="ts">
interface Vital {
  icon: string
  label: string
  value: string
  status: 'good' | 'medium' | 'none'
}

interface Place {
  name: string
  type: string
  neighborhood: string
  city: string
  distance: string
  isOpen: boolean
  tag?: string  // "Number one", "Coup de coeur", null
  image: string
  vitals: Vital[]
}

defineProps<{ place: Place }>()
</script>

<template>
  <article class="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(44,40,37,0.08)] cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,40,37,0.12)]">
    <!-- Image -->
    <div class="relative h-[200px] overflow-hidden">
      <img :src="place.image" :alt="place.name" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
      <!-- Tag -->
      <div v-if="place.tag" class="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[10px] font-bold uppercase tracking-wide" :class="place.tag === 'Number one' ? 'bg-[var(--color-terracotta-500)]' : 'bg-[var(--color-terracotta-500)]/85'">
        <UIcon v-if="place.tag === 'Number one'" name="lucide:crown" class="w-3.5 h-3.5" />
        <span>{{ place.tag }}</span>
      </div>
      <!-- Status badge -->
      <div class="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold uppercase backdrop-blur-md" :class="place.isOpen ? 'bg-[var(--color-monstera)]/90' : 'bg-[var(--color-terracotta-500)]/90'">
        {{ place.isOpen ? 'Ouvert' : 'Fermé' }}
      </div>
    </div>
    <!-- Body -->
    <div class="p-[18px]">
      <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.02em]">{{ place.name }}</h2>
      <p class="text-xs text-[var(--color-steam)] mt-1">{{ place.type }} · {{ place.neighborhood }}, {{ place.city }} · {{ place.distance }}</p>
      <!-- Vitals -->
      <PlaceVitals :vitals="place.vitals" class="mt-3.5" />
    </div>
  </article>
</template>
