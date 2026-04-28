<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useArticlesStore } from '../../stores/articles'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'
import { Plus, Search, FileText, Trash2, ImageOff } from 'lucide-vue-next'
import { getImageStatus, type ImageStatus } from '../../core/services/articleImageStatus'

const router = useRouter()
const store = useArticlesStore()

const searchQuery = ref('')
const statusFilter = ref<'all' | 'draft' | 'published'>('all')
const imageFilter = ref<'all' | 'missing' | 'external' | 'custom'>('all')
const sortMissingFirst = ref(true)

onMounted(async () => {
  if (!store.articles.length) {
    await store.fetchArticles()
  }
})

const filteredArticles = computed(() => {
  let result = store.articles.map(a => ({
    ...a,
    imageStatus: getImageStatus(a.cover_photo) as ImageStatus,
  }))

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      a => a.title.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
    )
  }

  if (statusFilter.value !== 'all') {
    result = result.filter(a => a.status === statusFilter.value)
  }

  if (imageFilter.value !== 'all') {
    result = result.filter(a => a.imageStatus === imageFilter.value)
  }

  if (sortMissingFirst.value) {
    const order: Record<ImageStatus, number> = { missing: 0, external: 1, custom: 2 }
    result = [...result].sort((a, b) => order[a.imageStatus] - order[b.imageStatus])
  }

  return result
})

const counts = computed(() => {
  const all = store.articles.map(a => getImageStatus(a.cover_photo))
  return {
    missing: all.filter(s => s === 'missing').length,
    external: all.filter(s => s === 'external').length,
    custom: all.filter(s => s === 'custom').length,
  }
})

async function handleCreate() {
  const article = store.createArticle()
  await store.saveArticle(article)
  router.push({ name: 'article-edit', params: { slug: article.slug } })
}

async function handleDelete(id: string) {
  if (confirm('Supprimer cet article ?')) {
    await store.deleteArticle(id)
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function badgeForImageStatus(status: ImageStatus): { variant: 'success' | 'warning' | 'danger', label: string } {
  if (status === 'custom') return { variant: 'success', label: 'OK' }
  if (status === 'external') return { variant: 'warning', label: 'URL' }
  return { variant: 'danger', label: 'Manquante' }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-roast">
          {{ store.articles.length }} article{{ store.articles.length > 1 ? 's' : '' }}
          <span class="ml-2 text-xs text-steam">
            · {{ counts.custom }} image custom · {{ counts.external }} URL · {{ counts.missing }} sans image
          </span>
        </p>
      </div>
      <BaseButton variant="primary" @click="handleCreate">
        <Plus :size="16" />
        Nouvel article
      </BaseButton>
    </div>

    <!-- Filtres -->
    <div class="bg-white rounded-xl border border-steam/15 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-roast mb-1">Recherche</label>
          <div class="relative">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-steam" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Titre, slug ou ville..."
              class="w-full rounded-lg border border-steam/30 bg-white pl-9 pr-3 py-2 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>
        <div class="min-w-[140px]">
          <label class="block text-xs font-medium text-roast mb-1">Statut</label>
          <select
            v-model="statusFilter"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary"
          >
            <option value="all">Tous</option>
            <option value="draft">Brouillons</option>
            <option value="published">Publiés</option>
          </select>
        </div>
        <div class="min-w-[160px]">
          <label class="block text-xs font-medium text-roast mb-1">Image hero</label>
          <select
            v-model="imageFilter"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary"
          >
            <option value="all">Toutes</option>
            <option value="missing">Manquantes ({{ counts.missing }})</option>
            <option value="external">URLs ({{ counts.external }})</option>
            <option value="custom">Custom ({{ counts.custom }})</option>
          </select>
        </div>
        <label class="flex items-center gap-2 pb-2">
          <input v-model="sortMissingFirst" type="checkbox" class="rounded border-steam/30" />
          <span class="text-xs text-roast">Trier par image manquante en premier</span>
        </label>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-steam/15 shadow-sm overflow-hidden">
      <table v-if="filteredArticles.length" class="w-full">
        <thead>
          <tr class="border-b border-steam/10">
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider w-[100px]">Image</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Titre</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Ville</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Statut</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Image hero</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Date</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="article in filteredArticles"
            :key="article.id"
            class="border-b border-steam/5 hover:bg-linen/50 cursor-pointer transition-colors even:bg-cream/30"
            @click="router.push({ name: 'article-edit', params: { slug: article.slug } })"
          >
            <td class="px-4 py-2">
              <div class="w-[80px] h-[52px] rounded-md overflow-hidden bg-linen border border-steam/15 flex items-center justify-center">
                <img
                  v-if="article.imageStatus !== 'missing'"
                  :src="article.cover_photo"
                  :alt="article.title"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
                <ImageOff v-else :size="18" class="text-steam" />
              </div>
            </td>
            <td class="px-4 py-3">
              <p class="text-sm font-semibold text-espresso line-clamp-1">{{ article.title }}</p>
              <p class="text-xs text-steam">/{{ article.slug }}</p>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm text-roast">{{ article.city || '-' }}</span>
            </td>
            <td class="px-4 py-3">
              <BaseBadge :variant="article.status === 'published' ? 'success' : 'neutral'">
                {{ article.status === 'published' ? 'Publié' : 'Brouillon' }}
              </BaseBadge>
            </td>
            <td class="px-4 py-3">
              <BaseBadge :variant="badgeForImageStatus(article.imageStatus).variant">
                {{ badgeForImageStatus(article.imageStatus).label }}
              </BaseBadge>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm text-roast whitespace-nowrap">{{ formatDate(article.updated_at) }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                class="p-1.5 text-steam hover:text-red-500 rounded transition-colors"
                @click.stop="handleDelete(article.id)"
              >
                <Trash2 :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div v-else class="py-12 text-center">
        <FileText :size="32" class="mx-auto text-steam mb-3" />
        <p class="text-sm text-roast">Aucun article ne correspond aux filtres</p>
      </div>
    </div>
  </div>
</template>
