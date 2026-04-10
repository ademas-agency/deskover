<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlacesStore } from '../../stores/places'
import { useNotificationsStore } from '../../stores/notifications'
import type { Place } from '../../core/domain/entities/Place'
import PlaceForm from '../components/place/PlaceForm.vue'
import { Check, X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = usePlacesStore()
const notifications = useNotificationsStore()

const placeId = computed(() => route.params.id as string)
const place = ref<Place | null>(null)
const saving = ref(false)

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
</script>

<template>
  <div class="space-y-6">
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
  </div>
</template>
