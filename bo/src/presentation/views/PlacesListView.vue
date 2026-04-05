<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlacesStore } from '../../stores/places'
import type { PlaceCategory } from '../../core/domain/entities/Place'
import { CATEGORY_LABELS } from '../../core/domain/entities/Place'
import PlaceTable from '../components/place/PlaceTable.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import { Search, Filter } from 'lucide-vue-next'

const store = usePlacesStore()

const searchQuery = ref('')
const categoryFilter = ref<PlaceCategory | ''>('')
const route = useRoute()

const statusFilter = ref<'all' | 'pending' | 'with_photo' | 'no_photo' | 'no_description' | 'no_signals' | 'to_enrich'>((route.query.filter as any) || 'all')
const currentPage = ref(1)
const pageSize = 20

onMounted(async () => {
  if (!store.places.length) {
    await store.fetchPlaces()
  }
})

const filteredPlaces = computed(() => {
  let result = store.places

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)
    )
  }

  // Category filter
  if (categoryFilter.value) {
    result = result.filter(p => p.category === categoryFilter.value)
  }

  // Status filter
  if (statusFilter.value === 'pending') {
    result = result.filter(p => p.status === 'pending')
  } else if (statusFilter.value === 'with_photo') {
    result = result.filter(p => p.photo_url || p.photo_storage_path)
  } else if (statusFilter.value === 'no_photo') {
    result = result.filter(p => !p.photo_url && !p.photo_storage_path)
  } else if (statusFilter.value === 'no_description') {
    result = result.filter(p => !p.description || p.description.trim() === '')
  } else if (statusFilter.value === 'no_signals') {
    result = result.filter(p => !p.signals?.length)
  } else if (statusFilter.value === 'to_enrich') {
    result = result.filter(
      p => !p.description || (!p.photo_url && !p.photo_storage_path) || p.signals.length === 0
    )
  }

  return result
})

// Reset page on filter change
watch([searchQuery, categoryFilter, statusFilter], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="space-y-6">
    <!-- Filtres -->
    <div class="bg-white rounded-xl border border-steam/15 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-4">
        <!-- Recherche -->
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-roast mb-1">Recherche</label>
          <div class="relative">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-steam" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Nom ou ville..."
              class="w-full rounded-lg border border-steam/30 bg-white pl-9 pr-3 py-2 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        <!-- Categorie -->
        <div class="min-w-[160px]">
          <label class="block text-xs font-medium text-roast mb-1">Catégorie</label>
          <select
            v-model="categoryFilter"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary"
          >
            <option value="">Toutes</option>
            <option v-for="(label, key) in CATEGORY_LABELS" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </div>

        <!-- Statut -->
        <div class="min-w-[160px]">
          <label class="block text-xs font-medium text-roast mb-1">Statut</label>
          <select
            v-model="statusFilter"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary"
          >
            <option value="all">Tous</option>
            <option value="pending">🔶 En attente de validation</option>
            <option value="with_photo">Avec photo</option>
            <option value="no_description">Sans description</option>
            <option value="to_enrich">À enrichir</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-steam mt-3">Chargement des lieux...</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p class="text-sm text-red-600">{{ store.error }}</p>
    </div>

    <!-- Table -->
    <PlaceTable
      v-else
      :places="filteredPlaces"
      v-model:currentPage="currentPage"
      :pageSize="pageSize"
    />
  </div>
</template>
