<script setup lang="ts">
import type { Place } from '~/domain/models/Place'

const { search, getAll } = usePlaces()
const router = useRouter()

const query = ref('')
const results = ref<Place[]>([])
const searching = ref(false)
const hasSearched = ref(false)

const mode = ref<'now' | 'later'>('now')

const criteriaFilters = reactive({
  wifi: false,
  prises: false,
  food: false,
  style: false
})

const categoryFilter = ref('')
const accessFilter = ref('')
const selectedDay = ref('')
const timeFrom = ref('')
const timeTo = ref('')

const categories = [
  { value: 'cafe', label: 'Café', icon: 'lucide:coffee' },
  { value: 'coffee_shop', label: 'Coffee Shop', icon: 'lucide:cup-soda' },
  { value: 'coworking', label: 'Coworking', icon: 'lucide:building-2' },
  { value: 'tiers_lieu', label: 'Tiers-lieu', icon: 'lucide:home' }
]

const accessOptions = [
  { value: 'free', label: 'Gratuit', icon: 'lucide:heart' },
  { value: 'paid', label: 'Payant', icon: 'lucide:credit-card' }
]

const criteriaList = [
  { key: 'wifi', icon: 'lucide:wifi', label: 'WiFi' },
  { key: 'prises', icon: 'lucide:zap', label: 'Prises' },
  { key: 'food', icon: 'lucide:utensils', label: 'Food' },
  { key: 'style', icon: 'lucide:sparkles', label: 'Style' }
]

const days = [
  { value: 'lundi', label: 'Lun' },
  { value: 'mardi', label: 'Mar' },
  { value: 'mercredi', label: 'Mer' },
  { value: 'jeudi', label: 'Jeu' },
  { value: 'vendredi', label: 'Ven' },
  { value: 'samedi', label: 'Sam' },
  { value: 'dimanche', label: 'Dim' }
]

const timeSlots = ['7h', '8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h', '22h']

function goToResults() {
  const params: Record<string, string> = {}
  if (query.value.trim()) params.q = query.value.trim()
  if (criteriaFilters.wifi) params.wifi = '1'
  if (criteriaFilters.prises) params.prises = '1'
  if (criteriaFilters.food) params.food = '1'
  if (criteriaFilters.style) params.style = '1'
  if (categoryFilter.value) params.type = categoryFilter.value
  if (accessFilter.value) params.access = accessFilter.value
  if (mode.value === 'now') params.open = '1'
  if (mode.value === 'later') {
    if (selectedDay.value) params.day = selectedDay.value
    if (timeFrom.value) params.from = timeFrom.value
    if (timeTo.value) params.to = timeTo.value
  }
  router.push({ path: '/', query: params })
}

function toggleCriteria(key: string) {
  criteriaFilters[key as keyof typeof criteriaFilters] = !criteriaFilters[key as keyof typeof criteriaFilters]
}

function isActive(key: string) {
  return criteriaFilters[key as keyof typeof criteriaFilters]
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)] pb-24">
    <!-- Header -->
    <div class="px-4 pt-[52px] pb-3 flex items-center gap-3">
      <NuxtLink to="/" class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center flex-shrink-0">
        <UIcon name="lucide:chevron-left" class="w-5 h-5 text-[var(--color-espresso)]" />
      </NuxtLink>
      <div class="flex-1 bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.06)] flex items-center h-12 px-4 gap-3">
        <UIcon name="lucide:search" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
        <input
          v-model="query"
          type="text"
          placeholder="Une ville, un quartier, un lieu..."
          class="flex-1 bg-transparent text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none"
          autofocus
        >
      </div>
    </div>

    <div class="px-4">
      <!-- Mode: Maintenant / Plus tard -->
      <div class="flex bg-[var(--color-linen)] rounded-2xl p-1 mt-1">
        <button
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200"
          :class="mode === 'now' ? 'bg-white text-[var(--color-espresso)] shadow-sm' : 'text-[var(--color-steam)]'"
          @click="mode = 'now'"
        >
          <UIcon name="lucide:locate" class="w-4 h-4" />
          Maintenant
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200"
          :class="mode === 'later' ? 'bg-white text-[var(--color-espresso)] shadow-sm' : 'text-[var(--color-steam)]'"
          @click="mode = 'later'"
        >
          <UIcon name="lucide:calendar" class="w-4 h-4" />
          Plus tard
        </button>
      </div>

      <!-- Mode NOW -->
      <p v-if="mode === 'now'" class="text-[12px] text-[var(--color-steam)] mt-3 italic">
        Spots ouverts maintenant, autour de toi
      </p>

      <!-- Mode LATER: day + time range -->
      <div v-if="mode === 'later'" class="mt-3">
        <p class="text-[12px] text-[var(--color-steam)] italic mb-3">Quand est-ce que tu veux y aller ?</p>

        <!-- Day picker -->
        <div class="flex gap-1.5">
          <button
            v-for="d in days"
            :key="d.value"
            class="flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all"
            :class="selectedDay === d.value ? 'bg-[var(--color-espresso)] text-white' : 'bg-white text-[var(--color-roast)]'"
            @click="selectedDay = selectedDay === d.value ? '' : d.value"
          >{{ d.label }}</button>
        </div>

        <!-- Time range -->
        <p class="text-[10px] font-bold uppercase tracking-wide text-[var(--color-steam)] mt-3 mb-1.5">De</p>
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          <button
            v-for="t in timeSlots"
            :key="'from-'+t"
            class="flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
            :class="timeFrom === t ? 'bg-[var(--color-espresso)] text-white' : 'bg-white text-[var(--color-roast)]'"
            @click="timeFrom = timeFrom === t ? '' : t"
          >{{ t }}</button>
        </div>

        <p class="text-[10px] font-bold uppercase tracking-wide text-[var(--color-steam)] mt-2.5 mb-1.5">À</p>
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          <button
            v-for="t in timeSlots"
            :key="'to-'+t"
            class="flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
            :class="timeTo === t ? 'bg-[var(--color-espresso)] text-white' : 'bg-white text-[var(--color-roast)]'"
            @click="timeTo = timeTo === t ? '' : t"
          >{{ t }}</button>
        </div>
      </div>

      <!-- Separator -->
      <div class="text-center py-4 text-[var(--color-parchment)] text-sm tracking-[4px]">· · ·</div>

      <!-- Vitals — same style as PlaceVitals -->
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em]">CE QUI COMPTE POUR TOI</h3>

      <div class="bg-[var(--color-linen)] rounded-[14px] mt-3 flex" style="padding: 14px 0;">
        <button
          v-for="(c, i) in criteriaList"
          :key="c.key"
          class="flex-1 flex flex-col items-center gap-[3px] relative"
          @click="toggleCriteria(c.key)"
        >
          <div v-if="i > 0" class="absolute left-0 top-2 bottom-2 w-px bg-[var(--color-parchment)]" />
          <UIcon :name="c.icon" class="w-7 h-7 transition-colors" :class="isActive(c.key) ? 'text-[var(--color-monstera)]' : 'text-[var(--color-steam)]'" />
          <span class="text-[9px] uppercase tracking-[0.06em] transition-colors" :class="isActive(c.key) ? 'text-[var(--color-monstera)] font-bold' : 'text-[var(--color-steam)]'">{{ c.label }}</span>
          <span class="text-[11px] font-bold transition-colors" :class="isActive(c.key) ? 'text-[var(--color-monstera)]' : 'text-transparent'">Important</span>
        </button>
      </div>

      <!-- Type de lieu — 2 col grid -->
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em] mt-6">TYPE DE LIEU</h3>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="flex flex-col items-center justify-center gap-1.5 rounded-2xl text-[11px] font-semibold transition-all duration-200"
          style="height:72px;"
          :style="{ background: categoryFilter === cat.value ? 'var(--color-terracotta-500)' : 'white', color: categoryFilter === cat.value ? 'white' : 'var(--color-roast)' }"
          @click="categoryFilter = categoryFilter === cat.value ? '' : cat.value"
        >
          <UIcon :name="cat.icon" class="w-5 h-5" />
          {{ cat.label }}
        </button>
      </div>

      <!-- Accès — 2 col grid -->
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em] mt-6">ACCÈS</h3>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
        <button
          v-for="opt in accessOptions"
          :key="opt.value"
          class="flex flex-col items-center justify-center gap-1.5 rounded-2xl text-[11px] font-semibold transition-all duration-200"
          style="height:72px;"
          :style="{ background: accessFilter === opt.value ? 'var(--color-terracotta-500)' : 'white', color: accessFilter === opt.value ? 'white' : 'var(--color-roast)' }"
          @click="accessFilter = accessFilter === opt.value ? '' : opt.value"
        >
          <UIcon :name="opt.icon" class="w-5 h-5" />
          {{ opt.label }}
        </button>
      </div>

    </div>

    <!-- Fixed CTA -->
    <div class="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-[var(--color-cream)] via-[var(--color-cream)] to-transparent z-40">
      <button
        class="w-full rounded-2xl font-bold bg-[var(--color-terracotta-500)] text-[var(--color-cream)] shadow-[0_4px_20px_rgba(170,76,77,0.25)] active:scale-[0.98] transition-transform"
        style="height: 56px;"
        @click="goToResults"
      >
        <span class="font-display text-[15px] tracking-[0.06em]">VOIR LES LIEUX</span>
      </button>
    </div>
  </div>
</template>
