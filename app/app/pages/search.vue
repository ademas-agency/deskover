<script setup lang="ts">
import type { Place } from '~/domain/models/Place'

const { search, getAll } = usePlaces()
const route = useRoute()
const router = useRouter()

// Initialize from query params (when coming back from /resultats via "Modifier la recherche")
const query = ref((route.query.q as string) || '')
const results = ref<Place[]>([])
const searching = ref(false)
const hasSearched = ref(false)

const initMode = route.query.open ? 'now' : (route.query.day || route.query.from || route.query.to) ? 'later' : 'any'
const mode = ref<'any' | 'now' | 'later'>(initMode)
const showWhen = ref(false)

// BAN autocomplete
const suggestions = ref<any[]>([])
const showSuggestions = ref(false)
let debounceTimer: ReturnType<typeof setTimeout>

async function onQueryInput() {
  const q = query.value.trim()
  if (q.length < 3) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&type=municipality`)
      const data = await res.json()
      suggestions.value = (data.features || []).map((f: any) => ({
        label: f.properties.label,
        city: f.properties.city || f.properties.name,
        postcode: f.properties.postcode,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }))
      showSuggestions.value = suggestions.value.length > 0
    } catch {
      suggestions.value = []
    }
  }, 300)
}

const selectedCoords = ref<{ lat: number; lng: number } | null>(
  route.query.lat && route.query.lng
    ? { lat: parseFloat(route.query.lat as string), lng: parseFloat(route.query.lng as string) }
    : null
)

const selectedPostcode = ref('')

function selectSuggestion(s: any) {
  query.value = s.city
  selectedCoords.value = { lat: s.lat, lng: s.lng }
  selectedPostcode.value = s.postcode || ''
  showSuggestions.value = false
}

const criteriaFilters = reactive({
  wifi: !!route.query.wifi,
  prises: !!route.query.prises,
  food: !!route.query.food,
  style: !!route.query.style
})

const categoryFilter = ref((route.query.type as string) || '')
const accessFilter = ref((route.query.access as string) || '')
const selectedDay = ref((route.query.day as string) || '')
const timeFrom = ref((route.query.from as string) || '')
const timeTo = ref((route.query.to as string) || '')

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
  { key: 'wifi', icon: 'lucide:wifi', label: 'WiFi', topValue: 'Rapide' },
  { key: 'prises', icon: 'lucide:zap', label: 'Prises', topValue: 'Partout' },
  { key: 'food', icon: 'lucide:utensils', label: 'Food', topValue: 'Complet' },
  { key: 'style', icon: 'lucide:sparkles', label: 'Style', topValue: 'Canon' }
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
  if (selectedCoords.value) {
    params.lat = String(selectedCoords.value.lat)
    params.lng = String(selectedCoords.value.lng)
  }
  if (selectedPostcode.value) params.cp = selectedPostcode.value
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
  router.push({ path: '/resultats', query: params })
}

function toggleCriteria(key: string) {
  criteriaFilters[key as keyof typeof criteriaFilters] = !criteriaFilters[key as keyof typeof criteriaFilters]
}

function isActive(key: string) {
  return criteriaFilters[key as keyof typeof criteriaFilters]
}

useSeoMeta({
  title: 'Rechercher un spot — Deskover',
  ogTitle: 'Rechercher un spot — Deskover',
  description: 'Trouve le spot idéal pour travailler : filtre par WiFi, prises, type de lieu, horaires. Cafés, coworkings et tiers-lieux partout en France.',
  ogDescription: 'Trouve le spot idéal pour travailler : filtre par WiFi, prises, type de lieu, horaires.',
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)] pb-24 lg:pb-0">

    <!-- Close button (desktop only) -->
    <div class="hidden lg:flex justify-end px-8 pt-4 lg:max-w-[680px] lg:mx-auto">
      <NuxtLink to="/" class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center">
        <UIcon name="lucide:x" class="w-5 h-5 text-[var(--color-espresso)]" />
      </NuxtLink>
    </div>

    <!-- Header -->
    <div class="px-5 pt-safe lg:pt-4 lg:px-8 pb-3 flex items-center gap-3 lg:max-w-[680px] lg:mx-auto">
      <NuxtLink to="/" class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center flex-shrink-0 lg:hidden">
        <UIcon name="lucide:chevron-left" class="w-5 h-5 text-[var(--color-espresso)]" />
      </NuxtLink>
      <div class="flex-1 relative">
        <div class="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.06)] flex items-center h-12 px-4 gap-3">
          <UIcon name="lucide:search" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
          <input
            v-model="query"
            type="text"
            placeholder="Une ville, un quartier, un lieu..."
            class="flex-1 bg-transparent text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none"
            autofocus
            @input="onQueryInput"
            @focus="showSuggestions = suggestions.length > 0"
          >
          <button v-if="query" class="text-[var(--color-steam)]" @click="query = ''; suggestions = []; showSuggestions = false">
            <UIcon name="lucide:x" class="w-4 h-4" />
          </button>
        </div>
        <!-- Suggestions BAN -->
        <div
          v-if="showSuggestions"
          class="absolute top-14 left-0 right-0 bg-white rounded-2xl shadow-[0_8px_24px_rgba(44,40,37,0.12)] overflow-hidden z-20"
        >
          <button
            v-for="s in suggestions"
            :key="s.label"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-linen)] transition-colors text-left"
            @click="selectSuggestion(s)"
          >
            <UIcon name="lucide:map-pin" class="w-4 h-4 text-[var(--color-steam)] flex-shrink-0" />
            <div>
              <div class="text-[14px] text-[var(--color-espresso)] font-medium">{{ s.city }}</div>
              <div class="text-[11px] text-[var(--color-steam)]">{{ s.postcode }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div class="px-5 lg:px-8 lg:max-w-[680px] lg:mx-auto">
      <!-- Pour quand -->
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em] mt-1">POUR QUAND</h3>

      <div class="grid grid-cols-2 gap-2 mt-3">
        <button
          class="flex flex-col items-center justify-center gap-1.5 rounded-2xl text-[12px] font-semibold transition-all duration-200 h-[72px]"
          :class="mode === 'now' ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-white text-[var(--color-roast)] shadow-[0_2px_8px_rgba(44,40,37,0.06)]'"
          @click="mode = mode === 'now' ? 'any' : 'now'"
        >
          <UIcon name="lucide:locate" class="w-5 h-5" />
          Maintenant
        </button>
        <button
          class="flex flex-col items-center justify-center gap-1.5 rounded-2xl text-[12px] font-semibold transition-all duration-200 h-[72px]"
          :class="mode === 'later' ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-white text-[var(--color-roast)] shadow-[0_2px_8px_rgba(44,40,37,0.06)]'"
          @click="mode = mode === 'later' ? 'any' : 'later'"
        >
          <UIcon name="lucide:calendar" class="w-5 h-5" />
          Une autre date
        </button>
      </div>

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
        <div class="flex gap-3 mt-3">
          <div class="flex-1">
            <p class="text-[10px] font-bold uppercase tracking-wide text-[var(--color-steam)] mb-1.5">De</p>
            <div class="relative">
              <select
                v-model="timeFrom"
                class="w-full appearance-none bg-white rounded-2xl px-4 py-3.5 pr-10 text-[15px] font-semibold text-[var(--color-espresso)] shadow-[0_2px_8px_rgba(44,40,37,0.06)] outline-none cursor-pointer"
              >
                <option value="">--</option>
                <option v-for="t in timeSlots" :key="'from-'+t" :value="t">{{ t }}</option>
              </select>
              <UIcon name="lucide:chevron-down" class="w-4 h-4 text-[var(--color-steam)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div class="flex-1">
            <p class="text-[10px] font-bold uppercase tracking-wide text-[var(--color-steam)] mb-1.5">À</p>
            <div class="relative">
              <select
                v-model="timeTo"
                class="w-full appearance-none bg-white rounded-2xl px-4 py-3.5 pr-10 text-[15px] font-semibold text-[var(--color-espresso)] shadow-[0_2px_8px_rgba(44,40,37,0.06)] outline-none cursor-pointer"
              >
                <option value="">--</option>
                <option v-for="t in timeSlots" :key="'to-'+t" :value="t">{{ t }}</option>
              </select>
              <UIcon name="lucide:chevron-down" class="w-4 h-4 text-[var(--color-steam)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
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
          <span class="text-[11px] font-bold transition-colors" :class="isActive(c.key) ? 'text-[var(--color-monstera)]' : 'text-[var(--color-steam)]'">{{ c.topValue }}</span>
        </button>
      </div>

      <!-- Type de lieu — 2 col grid -->
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em] mt-6">TYPE DE LIEU</h3>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
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
    <div class="fixed bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-[var(--color-cream)] via-[var(--color-cream)] to-transparent z-40 lg:static lg:mt-8 lg:p-0 lg:bg-transparent lg:pb-0 lg:max-w-[680px] lg:mx-auto lg:px-8">
      <button
        class="w-full rounded-2xl font-bold bg-[var(--color-terracotta-500)] text-[var(--color-cream)] shadow-[0_4px_20px_rgba(170,76,77,0.25)] active:scale-[0.98] transition-transform"
        style="height: 56px;"
        @click="goToResults"
      >
        <span class="font-display text-[15px] tracking-[0.06em]">VOIR LES LIEUX</span>
      </button>
    </div>
    <!-- Pas de FabCarte ici pour ne pas cacher le CTA -->
  </div>
</template>
