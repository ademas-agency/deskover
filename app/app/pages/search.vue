<script setup lang="ts">
import type { Place } from '~/domain/models/Place'

const { search, getAll } = usePlaces()

const query = ref('')
const results = ref<Place[]>([])
const searching = ref(false)
const hasSearched = ref(false)

const criteriaFilters = reactive({
  wifi: false,
  prises: false,
  food: false,
  style: false
})

const categoryFilter = ref('')
const accessFilter = ref('')
const openNow = ref(false)

const categories = [
  { value: '', label: 'Tout' },
  { value: 'cafe', label: 'Café' },
  { value: 'coffee_shop', label: 'Coffee Shop' },
  { value: 'coworking', label: 'Coworking' },
  { value: 'tiers_lieu', label: 'Tiers-lieu' }
]

const accessOptions = [
  { value: '', label: 'Tous' },
  { value: 'free', label: 'Gratuit' },
  { value: 'paid', label: 'Payant' }
]

const criteriaList = [
  { key: 'wifi', icon: 'lucide:wifi', label: 'WiFi' },
  { key: 'prises', icon: 'lucide:zap', label: 'Prises' },
  { key: 'food', icon: 'lucide:utensils', label: 'Food' },
  { key: 'style', icon: 'lucide:sparkles', label: 'Style' }
]

async function doSearch() {
  searching.value = true
  hasSearched.value = true
  if (query.value.trim()) {
    results.value = await search(query.value.trim())
  } else {
    results.value = await getAll({
      wifi: criteriaFilters.wifi || undefined,
      prises: criteriaFilters.prises || undefined,
      food: criteriaFilters.food || undefined,
      calme: criteriaFilters.style || undefined,
      category: categoryFilter.value || undefined
    })
  }
  searching.value = false
}

let timeout: ReturnType<typeof setTimeout>
watch(query, () => {
  clearTimeout(timeout)
  timeout = setTimeout(doSearch, 300)
})

function toggleCriteria(key: string) {
  criteriaFilters[key as keyof typeof criteriaFilters] = !criteriaFilters[key as keyof typeof criteriaFilters]
  doSearch()
}

function isActive(key: string) {
  return criteriaFilters[key as keyof typeof criteriaFilters]
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)] pb-10">
    <!-- Header -->
    <div class="flex items-center gap-3 px-5 pt-[52px] pb-5">
      <NuxtLink to="/" class="w-10 h-10 rounded-full bg-[var(--color-linen)] flex items-center justify-center flex-shrink-0">
        <UIcon name="lucide:chevron-left" class="w-5 h-5 text-[var(--color-espresso)]" />
      </NuxtLink>
      <div class="flex-1 relative">
        <UIcon name="lucide:search" class="w-4 h-4 text-[var(--color-steam)] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          v-model="query"
          type="text"
          placeholder="Une ville, un quartier, un lieu..."
          class="w-full bg-white rounded-2xl h-12 pl-11 pr-4 text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] shadow-[0_2px_12px_rgba(44,40,37,0.06)] outline-none focus:shadow-[0_4px_16px_rgba(44,40,37,0.1)] transition-shadow"
          autofocus
        >
      </div>
    </div>

    <!-- Criteria -->
    <div class="px-5">
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em]">CE QUI COMPTE POUR TOI</h3>
      <p class="text-[12px] text-[var(--color-steam)] mt-1">Sélectionne tes critères</p>

      <div class="grid grid-cols-2 gap-2.5 mt-3">
        <button
          v-for="c in criteriaList"
          :key="c.key"
          class="h-[88px] flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all duration-200"
          :class="isActive(c.key) ? 'bg-[#FFF0EF] shadow-sm' : 'bg-white shadow-[0_1px_4px_rgba(44,40,37,0.04)]'"
          @click="toggleCriteria(c.key)"
        >
          <UIcon :name="c.icon" class="w-6 h-6" :class="isActive(c.key) ? 'text-[var(--color-terracotta-500)]' : 'text-[var(--color-steam)]'" />
          <span class="text-[11px] font-bold uppercase tracking-wide" :class="isActive(c.key) ? 'text-[var(--color-terracotta-500)]' : 'text-[var(--color-steam)]'">{{ c.label }}</span>
          <span class="text-[10px]" :class="isActive(c.key) ? 'text-[var(--color-terracotta-500)] font-semibold' : 'text-[var(--color-steam)]'">{{ isActive(c.key) ? 'Important' : 'Indifférent' }}</span>
        </button>
      </div>
    </div>

    <!-- Type de lieu -->
    <div class="px-5 mt-5">
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em]">TYPE DE LIEU</h3>
      <div class="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="flex-shrink-0 px-4 h-9 rounded-full text-[12px] font-semibold transition-all duration-200"
          :class="categoryFilter === cat.value ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-white text-[var(--color-roast)] border-[1.5px] border-[var(--color-parchment)]'"
          @click="categoryFilter = cat.value; doSearch()"
        >{{ cat.label }}</button>
      </div>
    </div>

    <!-- Accès -->
    <div class="px-5 mt-5">
      <h3 class="font-display text-[17px] text-[var(--color-espresso)] tracking-[0.06em]">ACCÈS</h3>
      <div class="flex gap-2 mt-2.5">
        <button
          v-for="opt in accessOptions"
          :key="opt.value"
          class="px-4 h-9 rounded-full text-[12px] font-semibold transition-all duration-200"
          :class="accessFilter === opt.value ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-white text-[var(--color-roast)] border-[1.5px] border-[var(--color-parchment)]'"
          @click="accessFilter = opt.value; doSearch()"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- Ouvert -->
    <div class="px-5 mt-5 flex items-center justify-between">
      <span class="text-[14px] font-medium text-[var(--color-espresso)]">Ouvert maintenant</span>
      <button
        class="w-11 h-6 rounded-full transition-colors duration-200 relative"
        :class="openNow ? 'bg-[var(--color-monstera)]' : 'bg-[var(--color-parchment)]'"
        @click="openNow = !openNow"
      >
        <div class="w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform duration-200" :class="openNow ? 'translate-x-[22px]' : 'translate-x-0.5'" />
      </button>
    </div>

    <!-- Results / CTA -->
    <div class="px-5 mt-6">
      <!-- Search results -->
      <div v-if="query.trim() && hasSearched" class="flex flex-col gap-2.5">
        <p class="text-[12px] text-[var(--color-steam)] mb-1">{{ results.length }} résultat{{ results.length > 1 ? 's' : '' }}</p>
        <NuxtLink
          v-for="place in results.slice(0, 15)"
          :key="place.id"
          :to="`/lieu/${place.id}`"
          class="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-[0_1px_4px_rgba(44,40,37,0.04)]"
        >
          <img :src="place.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&h=200&fit=crop'" :alt="place.name" class="w-12 h-12 rounded-xl object-cover flex-shrink-0">
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-bold text-[var(--color-espresso)] truncate">{{ place.name }}</p>
            <p class="text-[11px] text-[var(--color-steam)] mt-0.5">{{ place.city }}</p>
            <div class="flex gap-2 mt-1">
              <UIcon v-for="v in place.vitals" :key="v.label" :name="v.icon" class="w-3 h-3" :class="v.status === 'good' ? 'text-[var(--color-monstera)]' : v.status === 'medium' ? 'text-[var(--color-edison)]' : 'text-[var(--color-steam)]'" />
            </div>
          </div>
          <UIcon name="lucide:chevron-right" class="w-4 h-4 text-[var(--color-parchment)] flex-shrink-0" />
        </NuxtLink>
        <p v-if="!results.length && !searching" class="text-sm text-[var(--color-steam)] text-center py-8">Aucun lieu trouvé</p>
      </div>

      <!-- CTA -->
      <button
        v-else
        class="w-full h-14 rounded-2xl font-bold bg-[var(--color-terracotta-500)] text-[var(--color-cream)]"
        @click="doSearch"
      >
        <span class="font-display text-[15px] tracking-wide">VOIR LES LIEUX</span>
      </button>
    </div>
  </div>
</template>
