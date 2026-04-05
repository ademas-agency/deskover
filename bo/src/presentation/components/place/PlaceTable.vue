<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Place } from '../../../core/domain/entities/Place'
import { CATEGORY_LABELS } from '../../../core/domain/entities/Place'
import BaseBadge from '../ui/BaseBadge.vue'
import { ExternalLink, MapPin } from 'lucide-vue-next'

const STORAGE_BASE = 'https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos'

function getThumb(place: Place): string | null {
  if (place.photo_storage_path) return `${STORAGE_BASE}/${place.photo_storage_path}`
  return place.photo_url || null
}

const props = defineProps<{
  places: Place[]
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  'update:currentPage': [value: number]
}>()

const router = useRouter()

const paginatedPlaces = computed(() => {
  const start = (props.currentPage - 1) * props.pageSize
  return props.places.slice(start, start + props.pageSize)
})

const totalPages = computed(() =>
  Math.ceil(props.places.length / props.pageSize)
)

function goToPlace(place: Place) {
  router.push({ name: 'place-edit', params: { id: place.id } })
}

function getCategoryVariant(category: string): 'primary' | 'success' | 'warning' | 'info' | 'neutral' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'neutral'> = {
    cafe: 'primary',
    coffee_shop: 'info',
    coworking: 'success',
    tiers_lieu: 'warning',
  }
  return map[category] || 'neutral'
}
</script>

<template>
  <div>
    <!-- Compteur -->
    <p class="text-sm text-roast mb-3">
      {{ places.length }} lieu{{ places.length > 1 ? 'x' : '' }}
    </p>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-steam/15 shadow-sm overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-steam/10">
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Photo</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Nom</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Ville</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Categorie</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Signaux</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Poids</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Note</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="place in paginatedPlaces"
            :key="place.id"
            class="border-b border-steam/5 hover:bg-linen/50 cursor-pointer transition-colors even:bg-cream/30"
            @click="goToPlace(place)"
          >
            <td class="px-4 py-3">
              <div class="w-12 h-12 rounded-lg overflow-hidden bg-linen flex-shrink-0">
                <img
                  v-if="getThumb(place)"
                  :src="getThumb(place)!"
                  :alt="place.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <MapPin :size="16" class="text-steam" />
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <p class="text-sm font-semibold text-espresso">{{ place.name }}</p>
              <p class="text-xs text-steam truncate max-w-[200px]">{{ place.address }}</p>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm text-roast">{{ place.city }}</span>
            </td>
            <td class="px-4 py-3">
              <BaseBadge :variant="getCategoryVariant(place.category)">
                {{ CATEGORY_LABELS[place.category] || place.category }}
              </BaseBadge>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1 max-w-[180px]">
                <span
                  v-for="signal in place.signals.slice(0, 3)"
                  :key="signal"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-linen text-roast"
                >
                  {{ signal }}
                </span>
                <span
                  v-if="place.signals.length > 3"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-linen text-steam"
                >
                  +{{ place.signals.length - 3 }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span
                v-if="place.curation_score !== 0"
                :class="[
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  place.curation_score > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                ]"
              >
                {{ place.curation_score > 0 ? '+' : '' }}{{ place.curation_score }}
              </span>
              <span v-else class="text-xs text-steam">0</span>
            </td>
            <td class="px-4 py-3">
              <span v-if="place.google_rating" class="text-sm font-medium text-espresso">
                {{ place.google_rating.toFixed(1) }}
              </span>
              <span v-else class="text-xs text-steam">-</span>
            </td>
            <td class="px-4 py-3 text-right">
              <ExternalLink :size="14" class="text-steam" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <p class="text-xs text-steam">
        Page {{ currentPage }} sur {{ totalPages }}
      </p>
      <div class="flex gap-1">
        <button
          v-for="page in Math.min(totalPages, 10)"
          :key="page"
          :class="[
            'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
            page === currentPage
              ? 'bg-primary text-white'
              : 'bg-white text-roast border border-steam/20 hover:bg-linen',
          ]"
          @click="emit('update:currentPage', page)"
        >
          {{ page }}
        </button>
        <template v-if="totalPages > 10">
          <span class="w-8 h-8 flex items-center justify-center text-steam">...</span>
          <button
            :class="[
              'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
              totalPages === currentPage
                ? 'bg-primary text-white'
                : 'bg-white text-roast border border-steam/20 hover:bg-linen',
            ]"
            @click="emit('update:currentPage', totalPages)"
          >
            {{ totalPages }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
