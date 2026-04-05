<script setup lang="ts">
import { useRouter } from 'vue-router'
import { MapPin, Image, FileText } from 'lucide-vue-next'
import { usePlacesStore } from '../../../stores/places'
import { CATEGORY_LABELS } from '../../../core/domain/entities/Place'

const store = usePlacesStore()
const router = useRouter()

function goToList(filter: string) {
  router.push({ name: 'places', query: { filter } })
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total -->
    <div
      class="bg-white rounded-xl border border-steam/15 shadow-sm p-5 cursor-pointer hover:border-primary/30 transition-colors"
      @click="goToList('all')"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin :size="20" class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-espresso">{{ store.totalPlaces }}</p>
          <p class="text-xs text-steam">Lieux au total</p>
        </div>
      </div>
    </div>

    <!-- Par categorie -->
    <div class="bg-white rounded-xl border border-steam/15 shadow-sm p-5">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-lg bg-monstera/10 flex items-center justify-center">
          <MapPin :size="20" class="text-monstera" />
        </div>
        <div>
          <p class="text-sm font-bold text-espresso">Par catégorie</p>
        </div>
      </div>
      <div class="space-y-1">
        <div v-for="(count, cat) in store.byCategory" :key="cat" class="flex justify-between text-xs">
          <span class="text-roast">{{ CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat }}</span>
          <span class="font-semibold text-espresso">{{ count }}</span>
        </div>
      </div>
    </div>

    <!-- Sans photo -->
    <div
      class="bg-white rounded-xl border border-steam/15 shadow-sm p-5 cursor-pointer hover:border-edison/30 transition-colors"
      @click="goToList('no_photo')"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-edison/10 flex items-center justify-center">
          <Image :size="20" class="text-edison" />
        </div>
        <div>
          <p class="text-2xl font-bold text-espresso">{{ store.withoutPhoto.length }}</p>
          <p class="text-xs text-steam">Sans photo</p>
        </div>
      </div>
    </div>

    <!-- Sans description -->
    <div
      class="bg-white rounded-xl border border-steam/15 shadow-sm p-5 cursor-pointer hover:border-red-200 transition-colors"
      @click="goToList('no_description')"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
          <FileText :size="20" class="text-red-500" />
        </div>
        <div>
          <p class="text-2xl font-bold text-espresso">{{ store.withoutDescription.length }}</p>
          <p class="text-xs text-steam">Sans description</p>
        </div>
      </div>
    </div>
  </div>
</template>
