<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Bell } from 'lucide-vue-next'

const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    places: 'Lieux',
    'place-edit': 'Modifier le lieu',
    map: 'Carte',
    articles: 'Articles',
    'article-edit': 'Modifier l\'article',
  }
  return titles[route.name as string] || 'Deskover'
})
</script>

<template>
  <header class="h-16 bg-cream border-b border-steam/15 flex items-center justify-between px-8">
    <h2 class="text-lg font-bold text-espresso">{{ pageTitle }}</h2>
    <div class="flex items-center gap-4">
      <button class="p-2 text-roast hover:text-espresso rounded-lg hover:bg-linen transition-colors">
        <Bell :size="18" />
      </button>
      <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
        D
      </div>
    </div>
  </header>
</template>
