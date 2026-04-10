<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import { usePlacesStore } from '../../../stores/places'
import { useNotificationsStore } from '../../../stores/notifications'
import BaseButton from '../ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const placesStore = usePlacesStore()
const notifications = useNotificationsStore()

const isPlaceEdit = computed(() => route.name === 'place-edit')
const currentPlaceId = computed(() => route.params.id as string)
const currentPlace = computed(() =>
  isPlaceEdit.value ? placesStore.getPlaceById(currentPlaceId.value) : null
)

const pageTitle = computed(() => {
  if (isPlaceEdit.value) {
    return currentPlace.value?.name || 'Modifier le lieu'
  }
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    places: 'Lieux',
    map: 'Carte',
    articles: 'Articles',
    'article-edit': 'Modifier l\'article',
    messages: 'Messages',
    ratings: 'Avis',
  }
  return titles[route.name as string] || 'Deskover'
})

function goBackToList() {
  // Si on vient de la liste (back est /places ou /places?...), router.back() préserve la query
  const back = (window.history.state as { back?: string } | null)?.back
  if (typeof back === 'string' && (back === '/places' || back.startsWith('/places?'))) {
    router.back()
  } else {
    router.push({ name: 'places' })
  }
}

// Delete place
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const affectedArticles = ref<{ slug: string }[]>([])
const checkingArticles = ref(false)

async function openDeleteConfirm() {
  showDeleteConfirm.value = true
  checkingArticles.value = true
  try {
    const res = await fetch(`/api/articles/check-place?placeId=${currentPlaceId.value}`)
    affectedArticles.value = await res.json()
  } catch {
    affectedArticles.value = []
  } finally {
    checkingArticles.value = false
  }
}

async function handleDelete() {
  deleting.value = true
  try {
    if (affectedArticles.value.length > 0) {
      await fetch('/api/articles/remove-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: currentPlaceId.value }),
      })
    }
    await placesStore.deletePlace(currentPlaceId.value)
    notifications.success('Lieu supprimé' + (affectedArticles.value.length ? ` et retiré de ${affectedArticles.value.length} article(s)` : ''))
    router.push({ name: 'places' })
  } catch (e: any) {
    notifications.error(e.message || 'Erreur lors de la suppression')
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}
</script>

<template>
  <header class="h-16 bg-cream border-b border-steam/15 flex items-center justify-between px-8">
    <div class="flex items-center gap-3">
      <button
        v-if="isPlaceEdit"
        @click="goBackToList"
        class="p-1.5 -ml-1.5 text-roast hover:text-espresso rounded-lg hover:bg-linen transition-colors"
        title="Retour aux lieux"
      >
        <ArrowLeft :size="20" />
      </button>
      <h2 class="text-lg font-bold text-espresso">{{ pageTitle }}</h2>
    </div>

    <!-- Place edit : delete button -->
    <button
      v-if="isPlaceEdit && currentPlace"
      @click="openDeleteConfirm"
      class="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
      title="Supprimer ce lieu"
    >
      <Trash2 :size="16" />
      Supprimer
    </button>
  </header>

  <!-- Delete confirmation modal -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showDeleteConfirm = false" />
      <div class="relative bg-white rounded-2xl shadow-xl p-6 max-w-md mx-4 space-y-4">
        <h3 class="text-lg font-semibold text-espresso">Supprimer ce lieu ?</h3>
        <p class="text-sm text-roast">
          <strong>{{ currentPlace?.name }}</strong> sera supprimé définitivement de la base. Cette action est irréversible.
        </p>

        <div v-if="checkingArticles" class="text-sm text-steam flex items-center gap-2">
          <div class="w-4 h-4 border-2 border-steam border-t-transparent rounded-full animate-spin" />
          Vérification des articles...
        </div>
        <div v-else-if="affectedArticles.length > 0" class="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          <p class="text-sm font-medium text-amber-800">
            Mentionné dans {{ affectedArticles.length }} article{{ affectedArticles.length > 1 ? 's' : '' }} :
          </p>
          <ul class="text-sm text-amber-700 list-disc list-inside">
            <li v-for="a in affectedArticles" :key="a.slug">{{ a.slug }}</li>
          </ul>
          <p class="text-xs text-amber-600 mt-1">
            La section correspondante sera automatiquement retirée de chaque article.
          </p>
        </div>

        <div class="flex gap-3 justify-end">
          <BaseButton variant="ghost" size="sm" @click="showDeleteConfirm = false">
            Annuler
          </BaseButton>
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            :disabled="deleting || checkingArticles"
            @click="handleDelete"
          >
            {{ deleting ? 'Suppression...' : 'Oui, supprimer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
