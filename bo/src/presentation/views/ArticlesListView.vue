<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useArticlesStore } from '../../stores/articles'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'
import { Plus, Search, FileText, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const store = useArticlesStore()

const searchQuery = ref('')
const statusFilter = ref<'all' | 'draft' | 'published'>('all')

onMounted(async () => {
  if (!store.articles.length) {
    await store.fetchArticles()
  }
})

const filteredArticles = computed(() => {
  let result = store.articles

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      a => a.title.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
    )
  }

  if (statusFilter.value !== 'all') {
    result = result.filter(a => a.status === statusFilter.value)
  }

  return result
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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-roast">
          {{ store.articles.length }} article{{ store.articles.length > 1 ? 's' : '' }}
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
              placeholder="Titre ou ville..."
              class="w-full rounded-lg border border-steam/30 bg-white pl-9 pr-3 py-2 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>
        <div class="min-w-[160px]">
          <label class="block text-xs font-medium text-roast mb-1">Statut</label>
          <select
            v-model="statusFilter"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary"
          >
            <option value="all">Tous</option>
            <option value="draft">Brouillons</option>
            <option value="published">Publies</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-steam/15 shadow-sm overflow-hidden">
      <table v-if="filteredArticles.length" class="w-full">
        <thead>
          <tr class="border-b border-steam/10">
            <th class="px-6 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Titre</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Ville</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Statut</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-roast uppercase tracking-wider">Date</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="article in filteredArticles"
            :key="article.id"
            class="border-b border-steam/5 hover:bg-linen/50 cursor-pointer transition-colors even:bg-cream/30"
            @click="router.push({ name: 'article-edit', params: { slug: article.slug } })"
          >
            <td class="px-6 py-4">
              <p class="text-sm font-semibold text-espresso">{{ article.title }}</p>
              <p class="text-xs text-steam">/{{ article.slug }}</p>
            </td>
            <td class="px-6 py-4">
              <span class="text-sm text-roast">{{ article.city || '-' }}</span>
            </td>
            <td class="px-6 py-4">
              <BaseBadge :variant="article.status === 'published' ? 'success' : 'neutral'">
                {{ article.status === 'published' ? 'Publie' : 'Brouillon' }}
              </BaseBadge>
            </td>
            <td class="px-6 py-4">
              <span class="text-sm text-roast">{{ formatDate(article.updated_at) }}</span>
            </td>
            <td class="px-6 py-4 text-right">
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
        <p class="text-sm text-roast">Aucun article</p>
        <p class="text-xs text-steam mt-1">Creez votre premier article</p>
      </div>
    </div>
  </div>
</template>
