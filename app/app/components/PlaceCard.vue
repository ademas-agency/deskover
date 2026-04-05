<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

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
  nextOpen?: string
  tag?: string
  image: string
  images?: string[]
  vitals: Vital[]
}

const props = defineProps<{ place: Place }>()

const allImages = computed(() => {
  const imgs: string[] = []
  if (props.place.image) imgs.push(props.place.image)
  if (props.place.images?.length) imgs.push(...props.place.images)
  return imgs.length ? imgs : [props.place.image]
})

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (allImages.value.length > 1) {
    // Stagger start so cards don't all slide at once
    const delay = Math.random() * 3000
    setTimeout(() => {
      timer = setInterval(() => {
        current.value = (current.value + 1) % allImages.value.length
      }, 5000)
    }, delay)
  }
})

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <article class="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(44,40,37,0.08)] cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,40,37,0.12)]">
    <!-- Image -->
    <div class="relative h-[200px] overflow-hidden">
      <img :src="allImages[current]" :alt="place.name" :key="current" class="w-full h-full object-cover transition-opacity duration-500">
      <!-- Tag -->
      <div v-if="place.tag" class="absolute top-3 left-3 flex items-center gap-1.5 px-3 rounded-lg text-white text-[10px] font-bold uppercase tracking-wide leading-[28px]" :style="{ background: place.tag === 'Deskovered #1' ? '#AA4C4D' : 'rgba(170,76,77,0.85)' }">
        <span>{{ place.tag }}</span>
      </div>
      <!-- Status badge -->
      <div class="absolute top-3 right-3 px-2.5 h-[28px] rounded-lg text-white text-[10px] font-bold backdrop-blur-md flex items-center justify-center" :style="{ background: place.isOpen ? 'rgba(91,122,94,0.92)' : 'rgba(170,76,77,0.92)' }">
        <template v-if="place.isOpen">OUVERT</template>
        <template v-else>{{ place.nextOpen || 'FERMÉ' }}</template>
      </div>
      <!-- Dots -->
      <div v-if="allImages.length > 1" class="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
        <div
          v-for="(_, i) in allImages"
          :key="i"
          class="h-1 rounded-full transition-all duration-300"
          :class="i === current ? 'bg-white w-2.5' : 'bg-white/40 w-1'"
        />
      </div>
    </div>
    <!-- Body -->
    <div class="p-[18px]">
      <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.02em]">{{ place.name }}</h2>
      <p class="text-xs text-[var(--color-steam)] mt-1">{{ place.type }}<template v-if="place.neighborhood"> · {{ place.neighborhood }}</template><template v-if="place.city"> · {{ place.city }}</template><template v-if="place.distance"> · {{ place.distance }}</template></p>
      <!-- Vitals -->
      <PlaceVitals :vitals="place.vitals" class="mt-3.5" />
    </div>
  </article>
</template>
