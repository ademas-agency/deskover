<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlacesStore } from '../../stores/places'
import { useArticlesStore } from '../../stores/articles'
import PlaceStats from '../components/place/PlaceStats.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'
import { CATEGORY_LABELS } from '../../core/domain/entities/Place'
import { MapPin, FileText, TrendingUp, AlertTriangle } from 'lucide-vue-next'

const placesStore = usePlacesStore()
const articlesStore = useArticlesStore()
const router = useRouter()

onMounted(async () => {
  if (!placesStore.places.length) {
    await placesStore.fetchPlaces()
  }
  if (!articlesStore.articles.length) {
    await articlesStore.fetchArticles()
  }
})

const recentPlaces = computed(() =>
  placesStore.places.slice(0, 8)
)

const topCities = computed(() => {
  const cities: Record<string, number> = {}
  placesStore.places.forEach(p => {
    cities[p.city] = (cities[p.city] || 0) + 1
  })
  return Object.entries(cities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
})
</script>

<template>
  <div class="space-y-8">
    <!-- Stats -->
    <PlaceStats />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Lieux a enrichir -->
      <BaseCard title="Lieux a enrichir" :padding="false">
        <div class="divide-y divide-steam/5">
          <div
            v-for="place in placesStore.toEnrich.slice(0, 6)"
            :key="place.google_place_id"
            class="px-6 py-3 flex items-center gap-3 hover:bg-linen/50 cursor-pointer transition-colors"
            @click="router.push({ name: 'place-edit', params: { id: place.google_place_id } })"
          >
            <div class="w-8 h-8 rounded-lg overflow-hidden bg-linen flex-shrink-0">
              <img
                v-if="place.photo_url"
                :src="place.photo_url"
                :alt="place.name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <AlertTriangle :size="12" class="text-edison" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-espresso truncate">{{ place.name }}</p>
              <p class="text-xs text-steam">{{ place.city }}</p>
            </div>
            <div class="flex gap-1">
              <span
                v-if="!place.description"
                class="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500"
              >
                desc.
              </span>
              <span
                v-if="!place.photo_url"
                class="text-[10px] px-1.5 py-0.5 rounded bg-edison/10 text-edison"
              >
                photo
              </span>
            </div>
          </div>
          <div v-if="!placesStore.toEnrich.length" class="px-6 py-8 text-center text-sm text-steam">
            Tous les lieux sont complets !
          </div>
        </div>
      </BaseCard>

      <!-- Top villes -->
      <BaseCard title="Top villes">
        <div class="space-y-3">
          <div v-for="[city, count] in topCities" :key="city" class="flex items-center gap-3">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-espresso">{{ city }}</span>
                <span class="text-xs text-steam">{{ count }} lieux</span>
              </div>
              <div class="h-2 rounded-full bg-linen overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary transition-all"
                  :style="{ width: `${(count / (topCities[0]?.[1] || 1)) * 100}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Articles recents -->
      <BaseCard title="Articles recents" :padding="false">
        <div v-if="articlesStore.articles.length" class="divide-y divide-steam/5">
          <div
            v-for="article in articlesStore.articles.slice(0, 5)"
            :key="article.id"
            class="px-6 py-3 flex items-center justify-between hover:bg-linen/50 cursor-pointer transition-colors"
            @click="router.push({ name: 'article-edit', params: { slug: article.slug } })"
          >
            <div>
              <p class="text-sm font-medium text-espresso">{{ article.title }}</p>
              <p class="text-xs text-steam">{{ article.city }}</p>
            </div>
            <BaseBadge :variant="article.status === 'published' ? 'success' : 'neutral'">
              {{ article.status === 'published' ? 'Publie' : 'Brouillon' }}
            </BaseBadge>
          </div>
        </div>
        <div v-else class="px-6 py-8 text-center text-sm text-steam">
          Aucun article pour le moment
        </div>
      </BaseCard>

      <!-- Derniers lieux ajoutes -->
      <BaseCard title="Derniers lieux" :padding="false">
        <div class="divide-y divide-steam/5">
          <div
            v-for="place in recentPlaces"
            :key="place.google_place_id"
            class="px-6 py-3 flex items-center gap-3 hover:bg-linen/50 cursor-pointer transition-colors"
            @click="router.push({ name: 'place-edit', params: { id: place.google_place_id } })"
          >
            <div class="w-8 h-8 rounded-lg overflow-hidden bg-linen flex-shrink-0">
              <img
                v-if="place.photo_url"
                :src="place.photo_url"
                :alt="place.name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <MapPin :size="12" class="text-steam" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-espresso truncate">{{ place.name }}</p>
              <p class="text-xs text-steam">{{ place.city }}</p>
            </div>
            <BaseBadge :variant="place.category === 'coworking' ? 'success' : place.category === 'cafe' ? 'primary' : 'neutral'">
              {{ CATEGORY_LABELS[place.category] || place.category }}
            </BaseBadge>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
