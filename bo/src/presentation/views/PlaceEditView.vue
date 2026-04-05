<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlacesStore } from '../../stores/places'
import { useNotificationsStore } from '../../stores/notifications'
import type { Place } from '../../core/domain/entities/Place'
import PlaceForm from '../components/place/PlaceForm.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { ArrowLeft, Trash2, Check, X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = usePlacesStore()
const notifications = useNotificationsStore()

const placeId = computed(() => route.params.id as string)
const place = ref<Place | null>(null)
const saving = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const affectedArticles = ref<{ slug: string }[]>([])
const checkingArticles = ref(false)

onMounted(async () => {
  if (!store.places.length) {
    await store.fetchPlaces()
  }
  place.value = store.getPlaceById(placeId.value) || null
})

async function handleSave(updatedPlace: Place) {
  saving.value = true
  try {
    await store.savePlace(placeId.value, updatedPlace)
    place.value = { ...updatedPlace }
    notifications.success('Lieu sauvegardé avec succès')
  } catch (e: any) {
    notifications.error(e.message || 'Erreur lors de la sauvegarde')
  } finally {
    saving.value = false
  }
}

async function handleApprove() {
  try {
    await store.approvePlace(placeId.value)
    if (place.value) place.value.status = 'approved'
    notifications.success('Lieu approuvé et visible sur le site')
  } catch (e: any) {
    notifications.error(e.message || 'Erreur')
  }
}

async function handleReject() {
  try {
    await store.rejectPlace(placeId.value)
    notifications.success('Lieu rejeté')
    router.push({ name: 'places' })
  } catch (e: any) {
    notifications.error(e.message || 'Erreur')
  }
}

async function openDeleteConfirm() {
  showDeleteConfirm.value = true
  checkingArticles.value = true
  try {
    const res = await fetch(`/api/articles/check-place?placeId=${placeId.value}`)
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
    // Remove from articles first
    if (affectedArticles.value.length > 0) {
      await fetch('/api/articles/remove-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: placeId.value }),
      })
    }
    // Then delete from Supabase
    await store.deletePlace(placeId.value)
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
  <div class="space-y-6">
    <!-- Top bar -->
    <div class="flex items-center justify-between">
      <BaseButton variant="ghost" size="sm" @click="router.push({ name: 'places' })">
        <ArrowLeft :size="16" />
        Retour aux lieux
      </BaseButton>
      <BaseButton
        v-if="place"
        variant="ghost"
        size="sm"
        class="!text-red-500 hover:!bg-red-50"
        @click="openDeleteConfirm"
      >
        <Trash2 :size="16" />
        Supprimer
      </BaseButton>
    </div>

    <!-- Pending banner -->
    <div v-if="place?.status === 'pending'" class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-amber-800">Suggestion utilisateur - en attente de validation</p>
        <p class="text-xs text-amber-600 mt-1">Ce lieu a été proposé par un utilisateur. Vérifie les infos avant de valider.</p>
      </div>
      <div class="flex gap-2 ml-4">
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-1.5"
          @click="handleApprove"
        >
          <Check :size="16" />
          Approuver
        </button>
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1.5"
          @click="handleReject"
        >
          <X :size="16" />
          Rejeter
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="!place" class="bg-edison/10 border border-edison/30 rounded-xl p-8 text-center">
      <p class="text-sm text-roast">Lieu non trouvé</p>
    </div>

    <!-- Form -->
    <PlaceForm v-else :place="place" :saving="saving" @save="handleSave" />

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40" @click="showDeleteConfirm = false" />
        <div class="relative bg-white rounded-2xl shadow-xl p-6 max-w-md mx-4 space-y-4">
          <h3 class="text-lg font-semibold text-espresso">Supprimer ce lieu ?</h3>
          <p class="text-sm text-roast">
            <strong>{{ place?.name }}</strong> sera supprimé définitivement de la base. Cette action est irréversible.
          </p>

          <!-- Articles check -->
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
  </div>
</template>
