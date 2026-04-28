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
  image?: string
  images?: string[]
  vitals: Vital[]
}

const props = defineProps<{ place: Place }>()

const allImages = computed(() => {
  const imgs: string[] = []
  if (props.place.image) imgs.push(props.place.image)
  if (props.place.images?.length) {
    for (const img of props.place.images) {
      if (!imgs.includes(img)) imgs.push(img)
    }
  }
  return imgs
})

const failedSrcs = ref(new Set<string>())
const allFailed = ref(false)

function onImgError() {
  failedSrcs.value.add(allImages.value[current.value])
  const nextValid = allImages.value.findIndex((src, i) => i !== current.value && !failedSrcs.value.has(src))
  if (nextValid !== -1) {
    current.value = nextValid
  } else {
    allFailed.value = true
  }
}

const showPlaceholder = computed(() => allImages.value.length === 0 || allFailed.value)

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function startRotation() {
  if (timer || allImages.value.length <= 1) return
  timer = setInterval(() => {
    current.value = (current.value + 1) % allImages.value.length
  }, 12000)
}

function stopRotation() {
  if (timer) { clearInterval(timer); timer = null }
}

onMounted(() => {
  if (allImages.value.length > 1) {
    // Stagger start so cards don't all slide at once
    const delay = Math.random() * 3000
    setTimeout(startRotation, delay)
  }
})

onUnmounted(stopRotation)

// Touch gesture: swipe to change image, hold to advance (Instagram-style), tap to navigate
const touchStartX = ref(0)
const touchStartY = ref(0)
const isDragging = ref(false)
const isHolding = ref(false)
const SWIPE_THRESHOLD = 30
const HOLD_DELAY_MS = 350
const HOLD_ADVANCE_MS = 1200
let holdTimer: ReturnType<typeof setTimeout> | null = null
let holdInterval: ReturnType<typeof setInterval> | null = null

function clearHoldTimers() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
  if (holdInterval) { clearInterval(holdInterval); holdInterval = null }
}

function onTouchStart(e: TouchEvent) {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  isDragging.value = false
  isHolding.value = false
  stopRotation()

  // After HOLD_DELAY_MS without swipe, start advancing images
  clearHoldTimers()
  if (allImages.value.length > 1) {
    holdTimer = setTimeout(() => {
      if (isDragging.value) return
      isHolding.value = true
      current.value = (current.value + 1) % allImages.value.length
      holdInterval = setInterval(() => {
        current.value = (current.value + 1) % allImages.value.length
      }, HOLD_ADVANCE_MS)
    }, HOLD_DELAY_MS)
  }
}

function onTouchMove(e: TouchEvent) {
  const dx = e.touches[0].clientX - touchStartX.value
  const dy = e.touches[0].clientY - touchStartY.value
  if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
    isDragging.value = true
    clearHoldTimers()
  }
}

function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX.value
  const len = allImages.value.length
  clearHoldTimers()

  if (isDragging.value && Math.abs(dx) > SWIPE_THRESHOLD && len > 1) {
    if (dx < 0) current.value = (current.value + 1) % len
    else current.value = (current.value - 1 + len) % len
    e.preventDefault()
    e.stopPropagation()
  }

  // Small delay to let the click event check the flag
  const wasInteraction = isDragging.value || isHolding.value
  setTimeout(() => {
    isDragging.value = false
    isHolding.value = false
  }, 50)

  // If it was a hold or swipe, prevent the click from navigating
  if (wasInteraction) {
    e.preventDefault()
    e.stopPropagation()
  }

  startRotation()
}

// Prevent parent NuxtLink navigation when user was swiping or holding
function onClickCapture(e: MouseEvent) {
  if (isDragging.value || isHolding.value) {
    e.preventDefault()
    e.stopPropagation()
  }
}
</script>

<template>
  <article class="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(44,40,37,0.08)] cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,40,37,0.12)] h-full flex flex-col">
    <!-- Image -->
    <div
      class="relative h-[200px] overflow-hidden select-none no-callout"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      @click.capture="onClickCapture"
      @contextmenu.prevent
    >
      <PlacePhotoPlaceholder v-if="showPlaceholder" :name="place.name" />
      <img v-else :src="allImages[current]" :alt="place.name" :key="current" loading="lazy" draggable="false" class="w-full h-full object-cover transition-opacity duration-500 pointer-events-none no-callout" @error="onImgError">
      <!-- Tag -->
      <div v-if="place.tag" class="absolute top-3 left-3 flex items-center gap-1.5 px-3 rounded-lg text-white text-[10px] font-bold uppercase tracking-wide leading-[28px]" :style="{ background: place.tag === 'Deskovered #1' ? '#AA4C4D' : 'rgba(170,76,77,0.85)' }">
        <UIcon name="lucide:crown" class="w-3 h-3" />
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
    <div class="p-[18px] flex-1 flex flex-col">
      <h2 class="font-display text-xl text-[var(--color-espresso)] tracking-[0.02em]">{{ place.name }}</h2>
      <p class="text-xs text-[var(--color-steam)] mt-1 line-clamp-2 pb-4">{{ place.type }}<template v-if="place.neighborhood"> · {{ place.neighborhood }}</template><template v-if="place.city"> · {{ place.city }}</template><template v-if="place.distance"> · {{ place.distance }}</template></p>
      <!-- Vitals -->
      <PlaceVitals :vitals="place.vitals" class="mt-auto pt-4" />
    </div>
  </article>
</template>

<style scoped>
.no-callout {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
</style>
