<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlacesStore } from '../../stores/places'
import { useNotificationsStore } from '../../stores/notifications'
import type { Place } from '../../core/domain/entities/Place'
import PlaceForm from '../components/place/PlaceForm.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = usePlacesStore()
const notifications = useNotificationsStore()

const placeId = computed(() => route.params.id as string)
const place = ref<Place | null>(null)

onMounted(async () => {
  if (!store.places.length) {
    await store.fetchPlaces()
  }
  place.value = store.getPlaceById(placeId.value) || null
})

function handleSave(updatedPlace: Place) {
  store.savePlace(placeId.value, updatedPlace)
  place.value = { ...updatedPlace }
  notifications.success('Lieu sauvegarde avec succes')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <div>
      <BaseButton variant="ghost" size="sm" @click="router.push({ name: 'places' })">
        <ArrowLeft :size="16" />
        Retour aux lieux
      </BaseButton>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="!place" class="bg-edison/10 border border-edison/30 rounded-xl p-8 text-center">
      <p class="text-sm text-roast">Lieu non trouve</p>
    </div>

    <!-- Form -->
    <PlaceForm v-else :place="place" @save="handleSave" />
  </div>
</template>
